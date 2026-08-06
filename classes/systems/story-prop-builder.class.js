import { StoryProp } from "../environment/story-prop.class.js";
import {
  STORY_PLAN,
  STORY_PROP_CONFIGS,
} from "../../js/config/story-prop-config.js";

/** Places the six non-colliding story beats on quiet, stable route surfaces. */
export class StoryPropBuilder {
  /**
   * Runs build with validated construction inputs.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {ReadonlyArray<object>} [occupiedObjects=[]] Occupied objects used while build.
   * @returns {ReadonlyArray<StoryProp>}
   */
  build(platforms, occupiedObjects = []) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
      throw new TypeError("Storyobjekte brauchen eine gebaute Plattformroute.");
    }
    const occupiedAnchorIds = new Set(
      occupiedObjects.map(({ anchorPlatformId }) => anchorPlatformId),
    );
    const usedAnchorIds = new Set();
    const storyProps = STORY_PLAN.map((definition, index) => {
      return this.#buildProp(platforms, definition, index, occupiedAnchorIds,
        usedAnchorIds);
    });
    return Object.freeze(storyProps);
  }

  /**
   * Builds prop.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {Readonly<object>} definition Definition used to create the requested object.
   * @param {Readonly<object>} index Zero-based route or stage index.
   * @param {Readonly<object>} occupied Occupied used while build prop.
   * @param {Readonly<object>} used Used used while build prop.
   */
  #buildProp(platforms, definition, index, occupied, used) {
    const config = STORY_PROP_CONFIGS[definition.type];
    const anchor = this.#selectAnchor(
      platforms, definition, config, occupied, used,
    );
    used.add(anchor.id);
    return this.#create(definition, index, config, anchor);
  }

  /**
   * Selects anchor.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {Readonly<object>} definition Definition used to create the requested object.
   * @param {Readonly<object>} config Configuration values used by the builder.
   * @param {ReadonlyArray<object>} occupiedAnchorIds Occupied anchor ids used while select anchor.
   * @param {ReadonlyArray<object>} usedAnchorIds Used anchor ids used while select anchor.
   */
  #selectAnchor(platforms, definition, config, occupiedAnchorIds, usedAnchorIds) {
    const minimumWidth = config.sprite.frameWidth * config.renderScale + 24;
    const candidates = this.#getCandidates(platforms, definition, minimumWidth,
      occupiedAnchorIds, usedAnchorIds);
    if (candidates[0]) return candidates[0];
    throw new RangeError(`Keine sichere Plattform für ${definition.type}.`);
  }

  /**
   * Returns candidates.
   * @param {ReadonlyArray<object>} platforms Platforms available for route construction.
   * @param {Readonly<object>} definition Definition used to create the requested object.
   * @param {number} minimumWidth Minimum width used while get candidates.
   * @param {Readonly<object>} occupied Occupied used while get candidates.
   * @param {Readonly<object>} used Used used while get candidates.
   */
  #getCandidates(platforms, definition, minimumWidth, occupied, used) {
    return platforms.filter((platform) => {
      const hasSafeRole = platform.routeRole === "main" ||
        platform.routeRole === "boss-arena-support";
      return hasSafeRole && this.#isEligible(
        platform, definition, minimumWidth, occupied, used,
      );
    }).sort((first, second) => {
      return Math.abs(first.y - definition.targetY) -
        Math.abs(second.y - definition.targetY);
    });
  }

  /**
   * Checks whether eligible.
   * @param {Readonly<object>} platform Platform inspected or extended by the builder.
   * @param {Readonly<object>} definition Definition used to create the requested object.
   * @param {number} minimumWidth Minimum width used while is eligible.
   * @param {Readonly<object>} occupied Occupied used while is eligible.
   * @param {Readonly<object>} used Used used while is eligible.
   */
  #isEligible(platform, definition, minimumWidth, occupied, used) {
    return platform.biomeId === definition.biomeId &&
      platform.width >= minimumWidth && !platform.mechanic &&
      !platform.requiresWallBounce && !platform.preparesWallBounce &&
      !occupied.has(platform.id) && !used.has(platform.id) &&
      typeof platform.getFrameDisplacement === "function";
  }

  /**
   * Creates operation.
   * @param {Readonly<object>} definition Definition used to create the requested object.
   * @param {Readonly<object>} index Zero-based route or stage index.
   * @param {Readonly<object>} config Configuration values used by the builder.
   * @param {Readonly<object>} anchor Platform used as the placement anchor.
   */
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
