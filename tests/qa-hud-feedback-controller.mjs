import assert from "node:assert/strict";
import { GAMEPLAY_EVENTS } from "../classes/core/gameplay-event-hub.class.js";
import { HudFeedbackController } from "../classes/ui/hud-feedback-controller.class.js";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }
}

function createElement() {
  const attributes = new Map();
  return {
    attributes, classList: new FakeClassList(), dataset: {},
    hidden: true, textContent: "", offsetWidth: 100,
    setAttribute: (name, value) => attributes.set(name, value),
  };
}

function createElements() {
  return {
    announcement: createElement(),
    fallFeedback: createElement(),
    jumpCharge: createElement(),
    jumpChargeBar: createElement(),
    jumpChargeValue: createElement(),
  };
}

function dispatch(controller, type, detail) {
  controller.handle({ type, detail });
}

const elements = createElements();
const controller = new HudFeedbackController(elements, 40);

dispatch(controller, GAMEPLAY_EVENTS.PICKUP, { type: "gear", amount: 2 });
assert.equal(elements.announcement.dataset.kind, "pickup");
assert.match(elements.announcement.textContent, /2/);

dispatch(controller, GAMEPLAY_EVENTS.BOSS_ACTIVATED, { name: "Mondwächter" });
assert.equal(elements.announcement.dataset.kind, "boss");
assert.match(elements.announcement.textContent, /Mondwächter/);

dispatch(controller, GAMEPLAY_EVENTS.WAVE_COMPLETE, {
  id: "scrapyard-biome-boss",
  unlockPlatformId: "exit",
});
assert.equal(elements.announcement.dataset.kind, "biome");
assert.match(elements.announcement.textContent, /Fabrik erreicht/);

dispatch(controller, GAMEPLAY_EVENTS.PLAYER_FALL, {
  lossPixels: 360,
  severity: "normal",
});
assert.equal(elements.fallFeedback.dataset.severity, "normal");
assert.match(elements.fallFeedback.textContent, /9/);

dispatch(controller, GAMEPLAY_EVENTS.PLAYER_JUMP_CHARGE, {
  percent: 140,
  isCharging: true,
});
assert.equal(elements.jumpCharge.hidden, false);
assert.equal(elements.jumpChargeValue.textContent, "100%");
assert.equal(elements.jumpChargeBar.attributes.get("aria-valuenow"), "100");

controller.destroy();
console.log("CLEAN-009: Kurze HUD-Rückmeldungen sind sauber gebündelt.");
