import assert from "node:assert/strict";
import { JourneyProgress } from
  "../classes/ui/journey-progress.class.js";

const sections = Object.freeze([
  Object.freeze({ backgroundId: "scrapyard", topY: 100, bottomY: 150 }),
  Object.freeze({ backgroundId: "factory", topY: 50, bottomY: 100 }),
  Object.freeze({ backgroundId: "moon", topY: 0, bottomY: 50 }),
]);
const journey = new JourneyProgress(sections, 150, 1);

assert.deepEqual(
  journey.getSnapshot(0),
  { biomeId: "scrapyard", percentage: 0 },
);
assert.deepEqual(
  journey.getSnapshot(75),
  { biomeId: "factory", percentage: 50 },
);
assert.deepEqual(
  journey.getSnapshot(150),
  { biomeId: "moon", percentage: 100 },
);
assert.deepEqual(journey.getSnapshot(-20), journey.getSnapshot(0));
assert.deepEqual(journey.getSnapshot(999), journey.getSnapshot(150));

console.log("QA-JOURNEY: Ziel, Biom und Fortschritt bleiben verständlich.");
