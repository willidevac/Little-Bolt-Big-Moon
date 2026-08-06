import { GAMEPLAY_EVENTS } from "../core/gameplay-event-hub.class.js";
import { FeedbackBurst } from "../effects/feedback-burst.class.js";

const BURST_BY_EVENT = Object.freeze({
  [GAMEPLAY_EVENTS.PLAYER_JUMP]: "jump",
  [GAMEPLAY_EVENTS.PLAYER_LAND]: "land",
  [GAMEPLAY_EVENTS.PLAYER_HURT]: "hurt",
  [GAMEPLAY_EVENTS.PICKUP]: "pickup",
});
const MAXIMUM_ACTIVE_BURSTS = 24;

/** Connects existing gameplay events to short canvas effects. */
export class VisualFeedbackSystem {
  /** @param {object} events Event source. @param {() => object|null} getTarget Target provider. */
  constructor(events, getTarget) {
    if (typeof events?.on !== "function" || typeof getTarget !== "function") {
      throw new TypeError("Dem visuellen Feedback fehlen Ereignisse oder Ziel.");
    }
    this.getTarget = getTarget;
    this.bursts = [];
    this.unsubscribe = events.on((event) => this.#handleEvent(event));
  }

  /** Updates bursts and removes those that have fully faded. */
  update(deltaTimeSeconds) {
    this.bursts = this.bursts.filter((burst) => burst.update(deltaTimeSeconds));
  }

  /** Draws all active bursts in world coordinates. */
  draw(context) {
    this.bursts.forEach((burst) => burst.draw(context));
  }

  /** Removes effects and the connection to the event source. */
  destroy() {
    this.unsubscribe();
    this.bursts.length = 0;
  }

  /** Handles event. */
  #handleEvent(event) {
    const burstType = BURST_BY_EVENT[event.type];
    const target = this.getTarget();
    if (!burstType || !target) return;
    this.bursts.push(new FeedbackBurst(burstType, target));
    if (this.bursts.length > MAXIMUM_ACTIVE_BURSTS) this.bursts.shift();
  }
}
