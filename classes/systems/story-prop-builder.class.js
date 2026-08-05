import { StoryProp } from "../environment/story-prop.class.js";
import {
  STORY_PLAN,
  STORY_PROP_CONFIGS,
} from "../../js/config/story-prop-config.js";

/** Places the six non-colliding story beats on quiet, stable route surfaces. */
export class StoryPropBuilder {
  /** @returns {ReadonlyArray<StoryProp>} */
  build(platforms, occupiedObjects = []) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new TypeError("Storyobjekte brauchen eine gebaute Plattformroute.");
    }
    const occupiedAnchorIds = new Set(
      occupiedObjects.map(({ anchorPlatformId }) => anchorPlatformId),
    );
    const usedAnchorIds = new Set();
    const storyProps = STORY_PLAN.map((definition, index) => {
      const config = STORY_PROP_CONFIGS[definition.type];
      const anchor = this.#selectAnchor(
        platforms, definition, config, occupiedAnchorIds, usedAnchorIds,
      );
      usedAnchorIds.add(anchor.id);
      return this.#create(definition, index, config, anchor);
    });
    return Object.freeze(storyProps);
  }

  #selectAnchor(platforms, definition, config, occupiedAnchorIds, usedAnchorIds) {
    const minimumWidth = config.sprite.frameWidth * config.renderScale + 24;
    const isEligible = (platform) => {
      return platform.biomeId === definition.biomeId &&
        platform.width >= minimumWidth && !platform.mechanic &&
        !platform.requiresWallBounce && !platform.preparesWallBounce &&
        !occupiedAnchorIds.has(platform.id) && !usedAnchorIds.has(platform.id) &&
        typeof platform.getFrameDisplacement === "function";
    };
    const candidates = platforms.filter((platform) => {
      const hasSafeRole = platform.routeRole === "main" ||
        platform.routeRole === "boss-arena-support";
      return hasSafeRole && isEligible(platform);
    }).sort((first, second) => {
      return Math.abs(first.y - definition.targetY) -
        Math.abs(second.y - definition.targetY);
    });
    if (candidates[0]) return candidates[0];
    throw new RangeError(`Keine sichere Plattform für ${definition.type}.`);
  }

  #create(definition, index, config, anchor) {
    const width = config.sprite.frameWidth * config.renderScale;
    const data = Object.freeze({
      id: `story-${String(index + 1).padStart(2, "0")}-${definition.type}`,
      type: definition.type,
      storyOrder: index + 1,
      storyBeat: definition.storyBeat,
      anchorPlatformId: anchor.id,
      x: Math.round(anchor.x + (anchor.width - width) / 2),
      y: anchor.y,
    });
    return new StoryProp(data, config, anchor);
  }
}
