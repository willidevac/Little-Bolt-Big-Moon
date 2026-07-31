import {
  MAXIMUM_AUTHORED_GAP_Y,
  MAXIMUM_PLATFORM_GAP_Y,
  MINIMUM_EDGE_GAP_Y,
  MINIMUM_PLATFORM_GAP_Y,
  PLATFORM_WIDTHS,
  SIDE_PADDING,
} from "../../js/config/platform-route-rules.js";

const ROOM_RISK_TYPES = new Set(["narrow", "moving", "falling"]);
const ROOM_SAFE_TYPES = new Set(["path", "catch"]);
const MINIMUM_ROOMS_PER_BIOME = 5;
const MINIMUM_ROOM_STEPS = 3;
const MAXIMUM_ROOM_STEPS = 6;

/** Prüft Gebietsrezepte, bevor daraus Plattformen entstehen. */
export class PlatformRouteValidator {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    this.worldWidth = worldWidth;
  }

  /** @param {Readonly<object>} section */
  validate(section) {
    if (this.#getSectionChecks(section).every(Boolean)) return;
    throw new TypeError(`Das Sprungrezept für ${section?.id ?? "ein Gebiet"} ist ungültig.`);
  }

  /** @param {ReadonlyArray<object>} sections */
  validatePlan(sections) {
    const biomeRooms = this.#groupRoomsByBiome(sections);
    const valid = [...biomeRooms.values()].every((roomIds) => {
      return roomIds.size >= MINIMUM_ROOMS_PER_BIOME;
    });
    if (valid && this.#hasUniqueRoomIds(sections)) return;
    throw new TypeError("Der Challenge-Raum-Plan ist ungültig.");
  }

  #hasUniqueRoomIds(sections) {
    const ids = sections.flatMap(({ route }) => {
      return route.rooms?.map(({ id }) => id) ?? [];
    });
    return new Set(ids).size === ids.length;
  }

  #groupRoomsByBiome(sections) {
    const biomeRooms = new Map();
    sections.forEach((section) => {
      const roomIds = biomeRooms.get(section.tileset) ?? new Set();
      section.route.rooms?.forEach(({ id }) => roomIds.add(id));
      biomeRooms.set(section.tileset, roomIds);
    });
    return biomeRooms;
  }

  #getSectionChecks(section) {
    const route = section?.route;
    return [
      typeof section?.id === "string",
      typeof section?.tileset === "string",
      this.#hasValidBounds(section),
      this.#hasValidPositions(route),
      this.#hasValidGaps(route),
      Number.isInteger(route?.catchEvery) && route.catchEvery > 0,
      this.#hasValidChallengeRules(route),
      this.#hasValidRooms(route?.rooms),
      Number.isFinite(route?.floorX),
    ];
  }

  #hasValidBounds(section) {
    return Number.isFinite(section?.topY) &&
      Number.isFinite(section?.bottomY) &&
      section.bottomY > section.topY;
  }

  #hasValidPositions(route) {
    return Array.isArray(route?.horizontalPositions) &&
      route.horizontalPositions.length > 0 &&
      route.horizontalPositions.every((x) => {
        return Number.isFinite(x) && x >= 0 && x < this.worldWidth;
      });
  }

  #hasValidGaps(route) {
    return Array.isArray(route?.verticalGaps) &&
      route.verticalGaps.length > 0 &&
      route.verticalGaps.every((gap) => {
        return Number.isFinite(gap) &&
          gap >= MINIMUM_PLATFORM_GAP_Y &&
          gap <= MAXIMUM_PLATFORM_GAP_Y;
      });
  }

  #hasValidRooms(rooms) {
    if (rooms === undefined) return true;
    return Array.isArray(rooms) && rooms.length > 0 &&
      rooms.every((room) => this.#hasValidRoom(room));
  }

  #hasValidRoom(room) {
    return typeof room?.id === "string" &&
      Array.isArray(room?.steps) &&
      room.steps.length >= MINIMUM_ROOM_STEPS &&
      room.steps.length <= MAXIMUM_ROOM_STEPS &&
      room.steps.every((step) => this.#hasValidAuthoredStep(step)) &&
      this.#hasSafeRoomEdges(room.steps) &&
      this.#hasControlledFallPath(room.steps);
  }

  #hasSafeRoomEdges(steps) {
    return ROOM_SAFE_TYPES.has(steps[0].type) &&
      ROOM_SAFE_TYPES.has(steps.at(-1).type);
  }

  #hasControlledFallPath(steps) {
    const entry = steps[0];
    return steps.slice(1, -1).some((step) => {
      return ROOM_RISK_TYPES.has(step.type) &&
        this.#overlapsHorizontally(entry, step);
    });
  }

  #overlapsHorizontally(lower, upper) {
    const lowerRight = lower.x + PLATFORM_WIDTHS[lower.type];
    const upperRight = upper.x + PLATFORM_WIDTHS[upper.type];
    return lower.x < upperRight && lowerRight > upper.x;
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
    const frequencies = [
      route?.narrowEvery,
      route?.movingEvery,
      route?.fallingEvery ?? 0,
    ];
    if (!frequencies.every((value) => Number.isInteger(value) && value >= 0)) {
      return false;
    }
    return this.#hasValidMovingRules(route) && this.#hasValidFallingRules(route);
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
