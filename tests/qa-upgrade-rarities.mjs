import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { UpgradeManager } from "../classes/systems/upgrade-manager.class.js";
import { TRANSLATION_CATALOG } from "../js/i18n/translation-catalog.js";

const data = JSON.parse(await fs.readFile("data/upgrades.json", "utf8"));
const effectCalls = [];
const effects = Object.fromEntries(
  data.upgrades.map(({ id }) => [id, (value) => effectCalls.push({ id, value })]),
);

assertDataModel();
assertUniqueWeightedSelection();
assertBoundedLevels();
await assertVisibleRarities();
assertInvalidData();

console.log("UPG-002: Zufall, Seltenheiten, Grenzen und Kartenanzeige bestanden.");

function assertDataModel() {
  assert.deepEqual(data.rarities.map(({ id }) => id), ["common", "rare", "epic"]);
  assert.deepEqual(data.rarities.map(({ weight }) => weight), [6, 3, 1]);
  data.upgrades.forEach((upgrade) => {
    assert.ok(data.rarities.some(({ id }) => id === upgrade.rarity));
    assert.ok(upgrade.maxLevel > 0);
  });
}

function assertUniqueWeightedSelection() {
  const manager = new UpgradeManager(data, effects, () => 0.999);
  const selection = manager.openSelection();
  assert.equal(selection.length, 3);
  assert.equal(new Set(selection.map(({ id }) => id)).size, 3);
  assert.equal(selection[0].rarity, "epic");
  assert.ok(selection.every((option) => Object.isFrozen(option)));
  assert.equal(manager.openSelection(), selection);
}

function assertBoundedLevels() {
  const manager = new UpgradeManager(data, effects, () => 0);
  const target = data.upgrades[0];
  for (let level = 1; level <= target.maxLevel; level += 1) {
    const option = manager.openSelection().find(({ id }) => id === target.id);
    assert.equal(option.nextLevel, level);
    manager.choose(target.id);
  }
  assert.ok(!manager.openSelection().some(({ id }) => id === target.id));
  assert.deepEqual(effectCalls.at(-1), { id: target.id, value: target.value });
  assert.throws(() => manager.choose(target.id), RangeError);
}

async function assertVisibleRarities() {
  const view = await fs.readFile("classes/ui/upgrade-option-view.class.js", "utf8");
  const styles = await fs.readFile("styles/upgrades.css", "utf8");
  data.rarities.forEach(({ id }) => {
    assert.ok(TRANSLATION_CATALOG.de[`upgrade.rarity.${id}`]);
    assert.ok(TRANSLATION_CATALOG.en[`upgrade.rarity.${id}`]);
    assert.match(styles, new RegExp(`data-rarity="${id}"|rarity-color`));
  });
  assert.match(view, /dataset\.rarity = upgrade\.rarity/);
  assert.match(view, /upgrade-card__rarity/);
  assert.match(view, /aria-label/);
}

function assertInvalidData() {
  const unknownRarity = structuredClone(data);
  unknownRarity.upgrades[0].rarity = "legendary";
  assert.throws(() => new UpgradeManager(unknownRarity, effects), TypeError);
  const invalidWeight = structuredClone(data);
  invalidWeight.rarities[0].weight = 0;
  assert.throws(() => new UpgradeManager(invalidWeight, effects), TypeError);
}
