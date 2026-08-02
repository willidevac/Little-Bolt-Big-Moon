import { PlatformDefinitionFactory } from
  "./platform-definition-factory.class.js";
import { PlatformRouteValidator } from "./platform-route-validator.class.js";
import {
  FLOOR_OFFSET_Y,
  MAXIMUM_PLATFORM_GAP_Y,
  MINIMUM_EDGE_GAP_Y,
  SECTION_EDGE_OFFSET_Y,
} from "../../js/config/platform-route-rules.js";

/**
 * Baut aus kleinen Gebietsrezepten eine feste, vollständig erreichbare Route.
 */
export class PlatformRouteBuilder {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    this.platformFactory = new PlatformDefinitionFactory(worldWidth);
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
    this.validator.validatePlan(sections);
    return Object.freeze(this.#buildSections(sections));
  }

  #buildSections(sections) {
    return sections.flatMap((section, sectionIndex) => {
      return this.#buildSection(
        section, sectionIndex, sections[sectionIndex + 1],
      );
    });
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
      y: this.#getSectionStartY(section, sectionIndex), routeIndex: 0,
    };
    const platforms = this.#createInitialPlatforms(section, sectionIndex, state);
    this.#appendGeneratedPlatforms(platforms, section, state);
    platforms.push(this.#createBoundary(
      section, state.routeIndex + 1, platforms.at(-1), nextSection,
    ));
    return platforms;
  }

  #createInitialPlatforms(section, sectionIndex, state) {
    if (sectionIndex !== 0) return [];
    return [this.platformFactory.create(section, 0, state.y, { isFloor: true })];
  }

  #appendGeneratedPlatforms(platforms, section, state) {
    const edgeY = section.topY + SECTION_EDGE_OFFSET_Y;
    while (state.y - edgeY > MAXIMUM_PLATFORM_GAP_Y) {
      const remainingHeight = state.y - edgeY;
      state.y -= this.#getNextGap(section, state.routeIndex, remainingHeight);
      state.routeIndex += 1;
      platforms.push(this.platformFactory.create(
        section, state.routeIndex, state.y,
        { previousPlatform: platforms.at(-1) },
      ));
    }
  }

  #buildAuthoredSection(section, sectionIndex, nextSection) {
    const platforms = [];
    const y = this.#getSectionStartY(section, sectionIndex);
    const previous = this.#addAuthoredFloor(platforms, section, sectionIndex, y);
    const state = { y, previous };
    this.#appendAuthoredRooms(platforms, section, state);
    platforms.push(this.#createBoundary(
      section, platforms.length, state.previous, nextSection,
    ));
    return platforms;
  }

  #appendAuthoredRooms(platforms, section, state) {
    section.route.rooms.forEach((room, roomIndex) => {
      this.#appendAuthoredRoom(platforms, section, room, roomIndex, state);
    });
  }

  #appendAuthoredRoom(platforms, section, room, roomIndex, state) {
    const roomStart = platforms.length;
    room.steps.forEach((step, stepIndex) => {
      state.y -= step.gapY;
      state.previous = this.platformFactory.createAuthored(
        section, room, roomIndex, step, stepIndex, state.y, state.previous,
      );
      platforms.push(state.previous);
    });
    this.#appendShortcut(platforms, section, room, roomIndex, roomStart);
  }

  #appendShortcut(platforms, section, room, roomIndex, roomStart) {
    if (!room.shortcut) return;
    let previous = platforms[roomStart];
    room.shortcut.forEach((step, shortcutIndex) => {
      const target = platforms[roomStart + step.stepIndex];
      previous = this.platformFactory.createShortcut(
        section, room, roomIndex, step, shortcutIndex, target.y, previous,
      );
      platforms.push(previous);
    });
    const exit = platforms[roomStart + room.steps.length - 1];
    this.platformFactory.assertAuthoredJump(exit, previous);
  }

  #addAuthoredFloor(platforms, section, sectionIndex, y) {
    if (sectionIndex !== 0) return null;
    const floor = this.platformFactory.create(section, 0, y, { isFloor: true });
    platforms.push(floor);
    return floor;
  }

  #createBoundary(section, routeIndex, previousPlatform, nextSection) {
    const y = section.topY + SECTION_EDGE_OFFSET_Y;
    return this.platformFactory.createBoundary(
      section, routeIndex, y, previousPlatform, nextSection,
    );
  }

  #getSectionStartY(section, sectionIndex) {
    if (sectionIndex === 0) return section.bottomY - FLOOR_OFFSET_Y;
    return section.bottomY + SECTION_EDGE_OFFSET_Y;
  }

  #getNextGap(section, routeIndex, remainingHeight) {
    const gaps = section.route.verticalGaps;
    const plannedGap = gaps[routeIndex % gaps.length];
    if (remainingHeight - plannedGap >= MINIMUM_EDGE_GAP_Y) return plannedGap;
    return Math.floor(remainingHeight / 2);
  }
}
