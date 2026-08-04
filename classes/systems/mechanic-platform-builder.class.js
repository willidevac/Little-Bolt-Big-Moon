import { TrapPlatform } from "../environment/trap-platform.class.js";
import { SpriteFallingPlatform } from
  "../environment/sprite-falling-platform.class.js";
import { SpringPlatform } from "../environment/spring-platform.class.js";
import {
  MECHANIC_PLATFORM_INTRODUCTIONS,
  MECHANIC_PLATFORM_SPRITES,
} from "../../js/config/mechanic-platform-config.js";

const TYPES = Object.freeze({
  trap: TrapPlatform,
  falling: SpriteFallingPlatform,
  spring: SpringPlatform,
});

/** Adds only the first controlled introduction of each advanced platform. */
export class MechanicPlatformBuilder {
  /** Creates one mechanic platform from route data. */
  create(definition) {
    const PlatformType = TYPES[definition.mechanic];
    if (!PlatformType) {
      throw new RangeError(`Unknown platform mechanic: ${definition.mechanic}`);
    }
    const data = Object.freeze({
      ...definition,
      kind: definition.kind ?? "mechanic-platform",
      platformRole: definition.mechanic,
    });
    return new PlatformType(
      data, MECHANIC_PLATFORM_SPRITES[definition.mechanic],
    );
  }

  /** @returns {ReadonlyArray<object>} The first gradual mechanic examples. */
  build() {
    return Object.freeze(MECHANIC_PLATFORM_INTRODUCTIONS.map((definition) => {
      return this.create(definition);
    }));
  }
}
