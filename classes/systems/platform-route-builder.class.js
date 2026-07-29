import { PlatformRouteValidator } from "./platform-route-validator.class.js";
import {
  FLOOR_OFFSET_Y,
  SECTION_EDGE_OFFSET_Y,
  MINIMUM_EDGE_GAP_Y,
  MAXIMUM_PLATFORM_GAP_Y,
  MAXIMUM_HORIZONTAL_GAP,
  MAXIMUM_AUTHORED_HORIZONTAL_GAP,
  SIDE_PADDING,
  PLATFORM_WIDTHS,
} from "../../js/config/platform-route-rules.js";

/**
 * Baut aus kleinen Gebietsrezepten eine feste, vollständig erreichbare Route.
 */
export class PlatformRouteBuilder {
  /**
   * @param {number} worldWidth
   */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("Die Weltbreite für die Plattformroute ist ungültig.");
    }
    this.worldWidth = worldWidth;
    this.validator = new PlatformRouteValidator(worldWidth);
  }

  /**
   * @param {ReadonlyArray<object>} sections
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  build(sections) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new TypeError("Die Plattformroute benötigt mindestens ein Gebiet.");
    }
    return Object.freeze(
      sections.flatMap((section, sectionIndex) => {
        return this.#buildSection(
          section,
          sectionIndex,
          sections[sectionIndex + 1],
        );
      }),
    );
  }

  #buildSection(section, sectionIndex, nextSection) {
    this.validator.validate(section);
    if (section.route.rooms) {
      return this.#buildAuthoredSection(section, sectionIndex, nextSection);
    }
    return this.#buildGeneratedSection(section, sectionIndex, nextSection);
  }

  #buildGeneratedSection(section, sectionIndex, nextSection) {
    const state = {
      y: this.#getSectionStartY(section, sectionIndex),
      routeIndex: 0,
    };
    const platforms = this.#createInitialPlatforms(section, sectionIndex, state);
    this.#appendGeneratedPlatforms(platforms, section, state);
    const edgeY = section.topY + SECTION_EDGE_OFFSET_Y;
    platforms.push(this.#createBoundaryPlatform(
      section, state.routeIndex + 1, edgeY, platforms.at(-1), nextSection,
    ));
    return platforms;
  }

  #createInitialPlatforms(section, sectionIndex, state) {
    if (sectionIndex !== 0) return [];
    return [this.#createPlatform(section, 0, state.y, { isFloor: true })];
  }

  #appendGeneratedPlatforms(platforms, section, state) {
    const edgeY = section.topY + SECTION_EDGE_OFFSET_Y;
    while (state.y - edgeY > MAXIMUM_PLATFORM_GAP_Y) {
      const remainingHeight = state.y - edgeY;
      const gap = this.#getNextGap(section, state.routeIndex, remainingHeight);
      state.routeIndex += 1;
      state.y -= gap;
      platforms.push(this.#createPlatform(section, state.routeIndex, state.y, {
        previousPlatform: platforms.at(-1),
      }));
    }
  }

  #buildAuthoredSection(section, sectionIndex, nextSection) {
    const platforms = [];
    const y = this.#getSectionStartY(section, sectionIndex);
    const previous = this.#addAuthoredFloor(platforms, section, sectionIndex, y);
    const state = { y, previous };
    this.#appendAuthoredRooms(platforms, section, state);
    platforms.push(this.#createBoundaryPlatform(
      section, platforms.length, section.topY + SECTION_EDGE_OFFSET_Y,
      state.previous, nextSection,
    ));
    return platforms;
  }

  #appendAuthoredRooms(platforms, section, state) {
    section.route.rooms.forEach((room, roomIndex) => {
      room.steps.forEach((step, stepIndex) => {
        this.#appendAuthoredStep(
          platforms, section, room, roomIndex, step, stepIndex, state,
        );
      });
    });
  }

  #appendAuthoredStep(
    platforms, section, room, roomIndex, step, stepIndex, state,
  ) {
    state.y -= step.gapY;
    state.previous = this.#createAuthoredPlatform(
      section, room, roomIndex, step, stepIndex, state.y, state.previous,
    );
    platforms.push(state.previous);
  }

  #addAuthoredFloor(platforms, section, sectionIndex, y) {
    if (sectionIndex !== 0) return null;
    const floor = this.#createPlatform(section, 0, y, { isFloor: true });
    platforms.push(floor);
    return floor;
  }

  #createAuthoredPlatform(
    section, room, roomIndex, step, stepIndex, y, previousPlatform,
  ) {
    this.#validateAuthoredJump(step, previousPlatform);
    const platform = this.#getAuthoredPlatformData(
      section, room, roomIndex, step, stepIndex, y,
    );
    this.#addPlatformBehavior(platform, section.route);
    return Object.freeze(platform);
  }

  #getAuthoredPlatformData(section, room, roomIndex, step, stepIndex, y) {
    return {
      id: `${section.id}-${room.id}-${roomIndex + 1}-${stepIndex + 1}`,
      x: step.x,
      y,
      type: step.type,
      tileset: section.tileset,
    };
  }

  #addPlatformBehavior(platform, route) {
    if (platform.type === "falling") {
      platform.fall = this.#createFall(route);
    }
    if (platform.type === "moving") {
      platform.movement = this.#createMovement(route, platform.x);
    }
  }

  #validateAuthoredJump(step, previousPlatform) {
    if (!previousPlatform) return;
    const horizontalGap = this.#getHorizontalGap(previousPlatform, step);
    if (horizontalGap <= MAXIMUM_AUTHORED_HORIZONTAL_GAP) return;
    throw new RangeError(`Der handgebaute Sprung hat ${horizontalGap}px Abstand.`);
  }

  #getHorizontalGap(lowerPlatform, upperPlatform) {
    const lowerRight = lowerPlatform.x + PLATFORM_WIDTHS[lowerPlatform.type];
    const upperRight = upperPlatform.x + PLATFORM_WIDTHS[upperPlatform.type];
    if (upperPlatform.x > lowerRight) return upperPlatform.x - lowerRight;
    if (lowerPlatform.x > upperRight) return lowerPlatform.x - upperRight;
    return 0;
  }

  #createBoundaryPlatform(section, routeIndex, y, previousPlatform, nextSection) {
    const bridgeX = this.#getBoundaryX(previousPlatform, nextSection);
    return this.#createPlatform(section, routeIndex, y, {
      isEdge: true,
      forcedX: bridgeX,
      previousPlatform,
    });
  }

  #getBoundaryX(previousPlatform, nextSection) {
    const previousCenterX = this.#getPlatformCenterX(previousPlatform);
    const nextCenterX = nextSection
      ? nextSection.route.horizontalPositions[0] + PLATFORM_WIDTHS.path / 2
      : previousCenterX;
    const bridgeCenterX = (previousCenterX + nextCenterX) / 2;
    const bridgeX = this.#clamp(
      Math.round(bridgeCenterX - PLATFORM_WIDTHS.catch / 2),
      SIDE_PADDING,
      this.worldWidth - SIDE_PADDING - PLATFORM_WIDTHS.catch,
    );
    return bridgeX;
  }

  #createPlatform(section, routeIndex, y, options = {}) {
    const route = section.route;
    const flags = this.#getPlatformFlags(route, routeIndex, options);
    const type = this.#getPlatformType(route, routeIndex, flags);
    const plannedX = this.#getPlannedX(route, routeIndex, type, options);
    const x = this.#getReachableX(plannedX, type, options.previousPlatform);
    const platform = this.#createPlatformData(section, routeIndex, type, x, y);
    this.#addPlatformBehavior(platform, route);
    return Object.freeze(platform);
  }

  #getPlatformFlags(route, routeIndex, options) {
    return {
      isFloor: options.isFloor ?? false,
      isCatch: (options.isEdge ?? false) ||
        routeIndex % route.catchEvery === 0,
    };
  }

  #getPlannedX(route, routeIndex, type, options) {
    if (Number.isFinite(options.forcedX)) return options.forcedX;
    if (type === "floor") return route.floorX;
    return this.#getCycledValue(
      route.horizontalPositions,
      Math.max(0, routeIndex - 1),
    );
  }

  #createPlatformData(section, routeIndex, type, x, y) {
    return {
      id: `${section.id}-${type}-${String(routeIndex).padStart(3, "0")}`,
      x,
      y,
      type,
      tileset: section.tileset,
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
    });
  }

  #getSectionStartY(section, sectionIndex) {
    if (sectionIndex === 0) return section.bottomY - FLOOR_OFFSET_Y;
    return section.bottomY + SECTION_EDGE_OFFSET_Y;
  }

  #getCycledValue(values, index) {
    return values[index % values.length];
  }

  #getPlatformCenterX(platform) {
    return platform.x + PLATFORM_WIDTHS[platform.type] / 2;
  }

  #getReachableX(plannedX, type, previousPlatform) {
    if (!previousPlatform) return plannedX;
    const minimumX = previousPlatform.x -
      PLATFORM_WIDTHS[type] -
      MAXIMUM_HORIZONTAL_GAP;
    const maximumX = previousPlatform.x +
      PLATFORM_WIDTHS[previousPlatform.type] +
      MAXIMUM_HORIZONTAL_GAP;
    return this.#clamp(plannedX, minimumX, maximumX);
  }

  #clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  #getNextGap(section, routeIndex, remainingHeight) {
    const plannedGap = this.#getCycledValue(
      section.route.verticalGaps,
      routeIndex,
    );
    if (remainingHeight - plannedGap >= MINIMUM_EDGE_GAP_Y) {
      return plannedGap;
    }
    return Math.floor(remainingHeight / 2);
  }

}
