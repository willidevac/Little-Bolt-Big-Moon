import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { TRANSLATION_CATALOG } from "../js/i18n/translation-catalog.js";
import { createLevelOne } from "../js/levels/level-01.js";
import { GameplayEventHub, GAMEPLAY_EVENTS } from
  "../classes/core/gameplay-event-hub.class.js";
import { WORLD_ENTITY_GROUPS } from "../classes/core/world-entity-groups.js";
import { WorldEventReporter } from
  "../classes/systems/world-event-reporter.class.js";
import { WaveManager } from "../classes/systems/wave-manager.class.js";
import { RunUpgradeFlow } from "../classes/systems/run-upgrade-flow.class.js";
import { GameAudioController } from
  "../classes/systems/game-audio-controller.class.js";
import { HudAnnouncement } from "../classes/ui/hud-announcement.class.js";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";

const upgradeData = JSON.parse(await fs.readFile("data/upgrades.json", "utf8"));
const level = createLevelOne(GAME_CONFIG.enemies);

assertBossStartEvent();
assertBossAnnouncement();
assertBossCompletionContext();
assertBossAudioReturnsToClimb();
await assertAccessibleUpgradeScreen();
assertTranslations();

console.log("GAME-002: Bossstart, Wegfreigabe und Upgrade-Hinweis bestanden.");

function assertBossStartEvent() {
  const events = new GameplayEventHub();
  const received = [];
  events.on((event) => received.push(event));
  const reporter = new WorldEventReporter(events);
  const character = createStillCharacter();
  reporter.capture(character, { isActive: false, phase: 1 });
  reporter.report(character, {
    isActive: true, phase: 1, name: "Schrottbrecher",
  });
  const event = received.find(({ type }) => type === GAMEPLAY_EVENTS.BOSS_ACTIVATED);
  assert.deepEqual(event.detail, { name: "Schrottbrecher" });
}

function createStillCharacter() {
  return {
    isOnGround: true,
    velocityY: 0,
    jumpChargePercent: 0,
    isChargingJump: false,
  };
}

function assertBossAnnouncement() {
  const element = createAnnouncementElement();
  const announcement = new HudAnnouncement(element);
  assert.equal(announcement.showBoss("boss.scrapCrusher"), true);
  assert.equal(element.textContent, "Schrottbrecher versperrt den Weg!");
  assert.equal(element.dataset.kind, "boss");
  assert.equal(announcement.showPickup({ type: "gear", amount: 1 }), false);
  assert.equal(announcement.showPathOpened(), true);
  assert.equal(element.textContent, "Boss besiegt – der Weg nach oben ist frei!");
  announcement.destroy();
}

function createAnnouncementElement() {
  return {
    classList: { add() {}, remove() {} },
    dataset: {},
    offsetWidth: 100,
    textContent: "",
  };
}

function assertBossCompletionContext() {
  const zone = level.combatZones.find(({ unlockPlatformId }) => unlockPlatformId);
  const enemy = level.enemies.find(({ id }) => id === zone.enemyIds[0]);
  const state = createWorldState();
  const world = createWorld(state);
  const manager = new WaveManager([zone], [enemy], level.platforms);
  world.waveManager = manager;
  manager.initialize(world);
  triggerAndDefeatBoss(manager, world, zone, state);
  assert.equal(state.events[0].detail.unlockPlatformId, zone.unlockPlatformId);
  assertUpgradeContext(world);
}

function createWorldState() {
  return { enemies: [], platforms: [...level.platforms], events: [] };
}

function createWorld(state) {
  return {
    character: { x: 0, y: 0, width: 64, height: 64 },
    gameplayEvents: { emit: (type, detail) => state.events.push({ type, detail }) },
    addEntity: (group, entity) => addEntity(state[group], entity),
    removeEntity: (group, entity) => removeEntity(state[group], entity),
    getEntities: () => Object.freeze([...state.enemies]),
  };
}

function addEntity(collection, entity) {
  if (!collection.includes(entity)) collection.push(entity);
}

function removeEntity(collection, entity) {
  const index = collection.indexOf(entity);
  if (index >= 0) collection.splice(index, 1);
}

function triggerAndDefeatBoss(manager, world, zone, state) {
  Object.assign(world.character, { x: zone.x, y: zone.y });
  manager.update(world);
  state.enemies.length = 0;
  manager.update(world);
  assert.ok(state.platforms.some(({ id }) => id === zone.unlockPlatformId));
}

function assertUpgradeContext(world) {
  const appliedPhases = [];
  const flow = new RunUpgradeFlow(upgradeData, createDependencies(appliedPhases));
  assert.equal(flow.openFrom(world), true);
  assert.deepEqual(appliedPhases, ["scrapyard-biome-boss"]);
  assert.equal(flow.getContext().didUnlockPath, true);
}

function createDependencies(appliedPhases) {
  return {
    runStats: {
      increaseMaximumEnergy() {}, increaseAmmoCapacity() {},
      increaseArcChargeCapacity() {},
      applyCombatPhases: (ids) => appliedPhases.push(...ids),
    },
    weaponSystem: { increaseDamage() {} },
    combatSystem: { increaseKnockbackResistance() {} },
    getCharacter: () => ({ increaseJumpControl() {} }),
  };
}

function assertBossAudioReturnsToClimb() {
  const music = [];
  const game = createAudioGame();
  const audio = createAudioMock(music);
  const controller = new GameAudioController(game, audio, new EventTarget());
  controller.handleGameplayEvent({ type: GAMEPLAY_EVENTS.BOSS_ACTIVATED, detail: {} });
  controller.handleGameplayEvent({ type: GAMEPLAY_EVENTS.WAVE_COMPLETE, detail: {} });
  assert.equal(controller.isBossActive, true);
  controller.handleGameplayEvent({
    type: GAMEPLAY_EVENTS.WAVE_COMPLETE, detail: { unlockPlatformId: "gate" },
  });
  assert.equal(controller.isBossActive, false);
  assert.equal(music.at(-1), "climb");
}

function createAudioGame() {
  return {
    state: "playing",
    onStateChange: () => () => {},
    onGameplayEvent: () => () => {},
  };
}

function createAudioMock(music) {
  return {
    playEffect: () => true,
    playMusic: (track) => music.push(track),
    setMusicVolume() {}, setEffectsVolume() {},
  };
}

async function assertAccessibleUpgradeScreen() {
  const [markup, controller] = await Promise.all([
    readAppMarkup(),
    fs.readFile("classes/ui/screen-controller.class.js", "utf8"),
  ]);
  assert.match(markup, /role="dialog"[\s\S]*?data-game-screen="upgrading"/);
  assert.match(markup, /aria-describedby="upgrade-copy"/);
  assert.match(markup, /data-upgrade-eyebrow/);
  assert.match(controller, /getUpgradeContext/);
  assert.match(controller, /upgrade\.boss/);
}

function assertTranslations() {
  ["de", "en"].forEach((language) => {
    const catalog = TRANSLATION_CATALOG[language];
    assert.ok(catalog["combat.bossStarted"]);
    assert.ok(catalog["combat.pathOpened"]);
    assert.ok(catalog["upgrade.boss.eyebrow"]);
    assert.ok(catalog["upgrade.boss.copy"]);
  });
}
