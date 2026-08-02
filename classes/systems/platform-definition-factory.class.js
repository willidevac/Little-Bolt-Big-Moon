import {
  FALLING_PLATFORM_DROP_PIXELS,
  FALLING_PLATFORM_RESPAWN_SECONDS,
  MAXIMUM_AUTHORED_HORIZONTAL_GAP,
  MAXIMUM_HORIZONTAL_GAP,
  PLATFORM_WIDTHS,
  SIDE_PADDING,
} from "../../js/config/platform-route-rules.js";

/**
 * Erstellt einzelne sichere Plattformdefinitionen für eine geplante Route.
 */
export class PlatformDefinitionFactory {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("Die Weltbreite für die Plattformroute ist ungültig.");
    }
    this.worldWidth = worldWidth;
  }

  /**
   * Erstellt eine automatisch geplante Plattform.
   * @param {Readonly<object>} section
   * @param {number} routeIndex
   * @param {number} y
   * @param {Readonly<object>} [options={}]
   * @returns {Readonly<object>}
   */
  create(section, routeIndex, y, options = {}) {
    const route = section.route;
    const flags = this.#getPlatformFlags(route, routeIndex, options);
    const type = this.#getPlatformType(route, routeIndex, flags);
    const plannedX = this.#getPlannedX(route, routeIndex, type, options);
    const x = this.#getReachableX(plannedX, type, options.previousPlatform);
    const platform = this.#createPlatformData(section, routeIndex, type, x, y);
    this.#addPlatformBehavior(platform, route);
    return Object.freeze(platform);
  }

  /**
   * Erstellt eine handgebaute Hauptplattform eines Challenge-Raums.
   * @param {Readonly<object>} section
   * @param {Readonly<object>} room
   * @param {number} roomIndex
   * @param {Readonly<object>} step
   * @param {number} stepIndex
   * @param {number} y
   * @param {Readonly<object>|null} previousPlatform
   * @returns {Readonly<object>}
   */
  createAuthored(
    section, room, roomIndex, step, stepIndex, y, previousPlatform,
  ) {
    this.assertAuthoredJump(step, previousPlatform);
    const platform = this.#getAuthoredData(
      section, room, roomIndex, step, stepIndex, y,
    );
    this.#addPlatformBehavior(platform, section.route);
    return Object.freeze(platform);
  }

  /**
   * Erstellt einen optionalen, schwereren Nebenweg.
   * @param {Readonly<object>} section
   * @param {Readonly<object>} room
   * @param {number} roomIndex
   * @param {Readonly<object>} step
   * @param {number} shortcutIndex
   * @param {number} y
   * @param {Readonly<object>} previousPlatform
   * @returns {Readonly<object>}
   */
  createShortcut(
    section, room, roomIndex, step, shortcutIndex, y, previousPlatform,
  ) {
    this.assertAuthoredJump(step, previousPlatform);
    const platform = {
      id: `${section.id}-${room.id}-shortcut-${shortcutIndex + 1}`,
      x: step.x, y, type: step.type, tileset: section.tileset,
      roomId: room.id, roomRole: "shortcut",
      rewardId: step.rewardId ?? null,
    };
    this.#addPlatformBehavior(platform, section.route);
    return Object.freeze(platform);
  }

  /**
   * Erstellt die verbindende Fangplattform zwischen zwei Gebieten.
   * @param {Readonly<object>} section
   * @param {number} routeIndex
   * @param {number} y
   * @param {Readonly<object>} previousPlatform
   * @param {Readonly<object>|undefined} nextSection
   * @returns {Readonly<object>}
   */
  createBoundary(section, routeIndex, y, previousPlatform, nextSection) {
    const forcedX = this.#getBoundaryX(previousPlatform, nextSection);
    return this.create(section, routeIndex, y, {
      isEdge: true, forcedX, previousPlatform,
    });
  }

  /**
   * Bricht bei einem zu weiten handgebauten Sprung ab.
   * @param {Readonly<object>} upperPlatform
   * @param {Readonly<object>|null} lowerPlatform
   */
  assertAuthoredJump(upperPlatform, lowerPlatform) {
    if (!lowerPlatform) return;
    const horizontalGap = this.#getHorizontalGap(lowerPlatform, upperPlatform);
    if (horizontalGap <= MAXIMUM_AUTHORED_HORIZONTAL_GAP) return;
    throw new RangeError(`Der handgebaute Sprung hat ${horizontalGap}px Abstand.`);
  }

  #getAuthoredData(section, room, roomIndex, step, stepIndex, y) {
    return {
      id: `${section.id}-${room.id}-${roomIndex + 1}-${stepIndex + 1}`,
      x: step.x, y, type: step.type, tileset: section.tileset,
      roomId: room.id,
      roomRole: this.#getRoomRole(room.steps.length, stepIndex),
    };
  }

  #getRoomRole(stepCount, stepIndex) {
    if (stepIndex === 0) return "entry";
    if (stepIndex === stepCount - 1) return "exit";
    return "challenge";
  }

  #addPlatformBehavior(platform, route) {
    if (platform.type === "falling") platform.fall = this.#createFall(route);
    if (platform.type === "moving") {
      platform.movement = this.#createMovement(route, platform.x);
    }
  }

  #getHorizontalGap(lowerPlatform, upperPlatform) {
    const lowerRight = lowerPlatform.x + PLATFORM_WIDTHS[lowerPlatform.type];
    const upperRight = upperPlatform.x + PLATFORM_WIDTHS[upperPlatform.type];
    if (upperPlatform.x > lowerRight) return upperPlatform.x - lowerRight;
    if (lowerPlatform.x > upperRight) return lowerPlatform.x - upperRight;
    return 0;
  }

  #getBoundaryX(previousPlatform, nextSection) {
    const previousCenterX = this.#getPlatformCenterX(previousPlatform);
    const nextCenterX = nextSection
      ? nextSection.route.horizontalPositions[0] + PLATFORM_WIDTHS.path / 2
      : previousCenterX;
    const bridgeCenterX = (previousCenterX + nextCenterX) / 2;
    return this.#clamp(
      Math.round(bridgeCenterX - PLATFORM_WIDTHS.catch / 2),
      SIDE_PADDING,
      this.worldWidth - SIDE_PADDING - PLATFORM_WIDTHS.catch,
    );
  }

  #getPlatformFlags(route, routeIndex, options) {
    return {
      isFloor: options.isFloor ?? false,
      isCatch: (options.isEdge ?? false) || routeIndex % route.catchEvery === 0,
    };
  }

  #getPlatformType(route, routeIndex, flags) {
    if (flags.isFloor) return "floor";
    if (flags.isCatch) return "catch";
    if (this.#matchesFrequency(route.movingEvery, routeIndex)) return "moving";
    if (this.#matchesFrequency(route.narrowEvery, routeIndex)) return "narrow";
    if (this.#matchesFrequency(route.fallingEvery ?? 0, routeIndex)) return "falling";
    return "path";
  }

  #getPlannedX(route, routeIndex, type, options) {
    if (Number.isFinite(options.forcedX)) return options.forcedX;
    if (type === "floor") return route.floorX;
    const positionIndex = Math.max(0, routeIndex - 1) %
      route.horizontalPositions.length;
    return route.horizontalPositions[positionIndex];
  }

  #getReachableX(plannedX, type, previousPlatform) {
    if (!previousPlatform) return plannedX;
    const minimumX = previousPlatform.x - PLATFORM_WIDTHS[type] -
      MAXIMUM_HORIZONTAL_GAP;
    const maximumX = previousPlatform.x + PLATFORM_WIDTHS[previousPlatform.type] +
      MAXIMUM_HORIZONTAL_GAP;
    return this.#clamp(plannedX, minimumX, maximumX);
  }

  #createPlatformData(section, routeIndex, type, x, y) {
    return {
      id: `${section.id}-${type}-${String(routeIndex).padStart(3, "0")}`,
      x, y, type, tileset: section.tileset,
    };
  }

  #matchesFrequency(frequency, routeIndex) {
    return frequency > 0 && routeIndex % frequency === 0;
  }

  #createMovement(route, x) {
    return Object.freeze({
      minimumX: Math.max(SIDE_PADDING, x - route.movingDistance),
      maximumX: Math.min(
        this.worldWidth - SIDE_PADDING - PLATFORM_WIDTHS.moving,
        x + route.movingDistance,
      ),
      speedPixelsPerSecond: route.movingSpeed,
    });
  }

  #createFall(route) {
    return Object.freeze({
      warningDelaySeconds: route.fallWarningSeconds,
      speedPixelsPerSecond: route.fallSpeed,
      maximumDropPixels: FALLING_PLATFORM_DROP_PIXELS,
      respawnDelaySeconds: FALLING_PLATFORM_RESPAWN_SECONDS,
    });
  }

  #getPlatformCenterX(platform) {
    return platform.x + PLATFORM_WIDTHS[platform.type] / 2;
  }

  #clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }
}
