import assert from "node:assert/strict";
import { GameplayEventHub, GAMEPLAY_EVENTS } from
  "../classes/core/gameplay-event-hub.class.js";
import { VisualFeedbackSystem } from
  "../classes/systems/visual-feedback-system.class.js";

const events = new GameplayEventHub();
const target = { x: 100, y: 200, width: 64, height: 64 };
const feedback = new VisualFeedbackSystem(events, () => target);
const context = createContext();

assertSupportedEventsDrawEffects();
assertEffectsExpire();
assertDestroyUnsubscribes();

console.log("FEEL-001: Bewegungs-, Treffer- und Sammelfeedback bestanden.");

function assertSupportedEventsDrawEffects() {
  const eventTypes = [
    GAMEPLAY_EVENTS.PLAYER_JUMP,
    GAMEPLAY_EVENTS.PLAYER_LAND,
    GAMEPLAY_EVENTS.PLAYER_HURT,
    GAMEPLAY_EVENTS.PICKUP,
  ];
  eventTypes.forEach((type) => events.emit(type));
  feedback.draw(context);
  assert.equal(context.drawCount, 31);
  assert.equal(context.saveCount, 4);
  assert.equal(context.restoreCount, 4);
}

function assertEffectsExpire() {
  feedback.update(1);
  const previousDrawCount = context.drawCount;
  feedback.draw(context);
  assert.equal(context.drawCount, previousDrawCount);
}

function assertDestroyUnsubscribes() {
  feedback.destroy();
  events.emit(GAMEPLAY_EVENTS.PLAYER_JUMP);
  feedback.draw(context);
  assert.equal(context.drawCount, 31);
}

function createContext() {
  return {
    drawCount: 0, saveCount: 0, restoreCount: 0,
    globalAlpha: 1, fillStyle: "",
    save() { this.saveCount += 1; },
    restore() { this.restoreCount += 1; },
    fillRect() { this.drawCount += 1; },
  };
}
