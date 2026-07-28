const FLOOR_OFFSET_Y = 160;
const SECTION_EDGE_OFFSET_Y = 64;
const MINIMUM_PLATFORM_GAP_Y = 80;
const MINIMUM_EDGE_GAP_Y = 64;
const MAXIMUM_PLATFORM_GAP_Y = 128;
const MAXIMUM_AUTHORED_GAP_Y = 180;
const MAXIMUM_HORIZONTAL_GAP = 128;
const MAXIMUM_AUTHORED_HORIZONTAL_GAP = 192;
const SIDE_PADDING = 64;
const PLATFORM_WIDTHS = Object.freeze({
  floor: 1152,
  path: 192,
  narrow: 128,
  moving: 192,
  falling: 192,
  catch: 512,
});

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
    this.#validateSection(section);
    if (section.route.rooms) {
      return this.#buildAuthoredSection(section, sectionIndex, nextSection);
    }
    return this.#buildGeneratedSection(section, sectionIndex, nextSection);
  }

  #buildGeneratedSection(section, sectionIndex, nextSection) {
    const platforms = [];
    let y = this.#getSectionStartY(section, sectionIndex);
    let routeIndex = 0;
    if (sectionIndex === 0) {
      platforms.push(
        this.#createPlatform(section, routeIndex, y, { isFloor: true }),
      );
    }
    const edgeY = section.topY + SECTION_EDGE_OFFSET_Y;
    while (y - edgeY > MAXIMUM_PLATFORM_GAP_Y) {
      const remainingHeight = y - edgeY;
      const gap = this.#getNextGap(section, routeIndex, remainingHeight);
      routeIndex += 1;
      y -= gap;
      platforms.push(this.#createPlatform(section, routeIndex, y, {
        previousPlatform: platforms.at(-1),
      }));
    }
    platforms.push(this.#createBoundaryPlatform(
      section,
      routeIndex + 1,
      edgeY,
      platforms.at(-1),
      nextSection,
    ));
    return platforms;
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
    this.#addAuthoredBehavior(platform, section.route);
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

  #addAuthoredBehavior(platform, route) {
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
    return this.#createPlatform(
      section,
      routeIndex,
      y,
      {
        isEdge: true,
        forcedX: bridgeX,
        previousPlatform,
      },
    );
  }

  #createPlatform(section, routeIndex, y, options = {}) {
    const {
      isFloor = false,
      isEdge = false,
      forcedX,
      previousPlatform,
    } = options;
    const route = section.route;
    const isCatch = isEdge || routeIndex % route.catchEvery === 0;
    const type = this.#getPlatformType(route, routeIndex, isFloor, isCatch);
    const plannedX = forcedX ?? (isFloor
      ? route.floorX
      : this.#getCycledValue(
        route.horizontalPositions,
        Math.max(0, routeIndex - 1),
      ));
    const x = this.#getReachableX(plannedX, type, previousPlatform);
    const platform = {
      id: `${section.id}-${type}-${String(routeIndex).padStart(3, "0")}`,
      x,
      y,
      type,
      tileset: section.tileset,
    };
    if (type === "moving") platform.movement = this.#createMovement(route, x);
    if (type === "falling") platform.fall = this.#createFall(route);
    return Object.freeze(platform);
  }

  #getPlatformType(route, routeIndex, isFloor, isCatch) {
    if (isFloor) return "floor";
    if (isCatch) return "catch";
    if (route.movingEvery > 0 && routeIndex % route.movingEvery === 0) {
      return "moving";
    }
    if (route.narrowEvery > 0 && routeIndex % route.narrowEvery === 0) {
      return "narrow";
    }
    const fallingEvery = route.fallingEvery ?? 0;
    if (fallingEvery > 0 && routeIndex % fallingEvery === 0) {
      return "falling";
    }
    return "path";
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

  #validateSection(section) {
    const hasBounds = Number.isFinite(section?.topY) &&
      Number.isFinite(section?.bottomY) &&
      section.bottomY > section.topY;
    const route = section?.route;
    const positionsAreValid = Array.isArray(route?.horizontalPositions) &&
      route.horizontalPositions.length > 0 &&
      route.horizontalPositions.every((x) => {
        return Number.isFinite(x) && x >= 0 && x < this.worldWidth;
      });
    const gapsAreValid = Array.isArray(route?.verticalGaps) &&
      route.verticalGaps.length > 0 &&
      route.verticalGaps.every((gap) => {
        return Number.isFinite(gap) &&
          gap >= MINIMUM_PLATFORM_GAP_Y &&
          gap <= MAXIMUM_PLATFORM_GAP_Y;
      });
    const catchEveryIsValid = Number.isInteger(route?.catchEvery) &&
      route.catchEvery > 0;
    const challengeRulesAreValid = this.#hasValidChallengeRules(route);
    const roomsAreValid = this.#hasValidRooms(route?.rooms);
    if (
      typeof section?.id === "string" &&
      typeof section?.tileset === "string" &&
      hasBounds &&
      positionsAreValid &&
      gapsAreValid &&
      catchEveryIsValid &&
      challengeRulesAreValid &&
      roomsAreValid &&
      Number.isFinite(route?.floorX)
    ) {
      return;
    }
    throw new TypeError(`Das Sprungrezept für ${section?.id ?? "ein Gebiet"} ist ungültig.`);
  }

  #hasValidRooms(rooms) {
    if (rooms === undefined) return true;
    return Array.isArray(rooms) && rooms.length > 0 &&
      rooms.every((room) => this.#hasValidRoom(room));
  }

  #hasValidRoom(room) {
    return typeof room?.id === "string" &&
      Array.isArray(room?.steps) &&
      room.steps.length > 0 &&
      room.steps.every((step) => this.#hasValidAuthoredStep(step));
  }

  #hasValidAuthoredStep(step) {
    const typeIsValid = Object.hasOwn(PLATFORM_WIDTHS, step?.type);
    const xIsValid = Number.isFinite(step?.x) &&
      step.x >= SIDE_PADDING &&
      step.x + PLATFORM_WIDTHS[step.type] <= this.worldWidth - SIDE_PADDING;
    const gapIsValid = Number.isFinite(step?.gapY) &&
      step.gapY >= MINIMUM_EDGE_GAP_Y &&
      step.gapY <= MAXIMUM_AUTHORED_GAP_Y;
    return typeIsValid && xIsValid && gapIsValid;
  }

  #hasValidChallengeRules(route) {
    const frequenciesAreValid = [
      route?.narrowEvery,
      route?.movingEvery,
      route?.fallingEvery ?? 0,
    ]
      .every((value) => Number.isInteger(value) && value >= 0);
    if (!frequenciesAreValid) return false;
    return this.#hasValidMovingRules(route) &&
      this.#hasValidFallingRules(route);
  }

  #hasValidMovingRules(route) {
    const needsMovement = route.movingEvery > 0 ||
      this.#hasAuthoredType(route, "moving");
    if (!needsMovement) return true;
    return Number.isFinite(route.movingDistance) &&
      route.movingDistance > 0 &&
      Number.isFinite(route.movingSpeed) &&
      route.movingSpeed > 0;
  }

  #hasValidFallingRules(route) {
    const needsFalling = (route.fallingEvery ?? 0) > 0 ||
      this.#hasAuthoredType(route, "falling");
    if (!needsFalling) return true;
    return Number.isFinite(route.fallWarningSeconds) &&
      route.fallWarningSeconds > 0 &&
      Number.isFinite(route.fallSpeed) &&
      route.fallSpeed > 0;
  }

  #hasAuthoredType(route, type) {
    return route.rooms?.some((room) => {
      return room.steps.some((step) => step.type === type);
    }) ?? false;
  }
}
