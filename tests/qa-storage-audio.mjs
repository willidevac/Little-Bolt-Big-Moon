import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AudioManager } from "../classes/systems/audio-manager.class.js";
import {
  GameAudioController,
} from "../classes/systems/game-audio-controller.class.js";
import {
  GameplayEventHub,
  GAMEPLAY_EVENTS,
} from "../classes/core/gameplay-event-hub.class.js";
import {
  WorldEventReporter,
} from "../classes/systems/world-event-reporter.class.js";
import { GAME_STATES } from "../classes/core/game-state-machine.class.js";
import { GameStorage } from "../classes/systems/game-storage.class.js";
import {
  StorageController,
} from "../classes/ui/storage-controller.class.js";
import { GAME_CONFIG } from "../js/config/game-config.js";

class FakeHTMLElement {}
globalThis.HTMLElement = FakeHTMLElement;

class FakeAudio {
  constructor(source) {
    this.source = source;
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.playCount = 0;
    this.pauseCount = 0;
  }

  load() {}

  play() {
    this.paused = false;
    this.ended = false;
    this.playCount += 1;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.pauseCount += 1;
  }
}

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  dispatch(type) {
    this.listeners.get(type)?.();
  }
}

class FakeGame {
  constructor() {
    this.state = GAME_STATES.HOME;
    this.stateListeners = new Set();
    this.gameplayListeners = new Set();
  }

  onStateChange(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onGameplayEvent(listener) {
    this.gameplayListeners.add(listener);
    return () => this.gameplayListeners.delete(listener);
  }

  setState(state) {
    this.state = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  emit(type, detail = {}) {
    const event = Object.freeze({ type, detail: Object.freeze(detail) });
    this.gameplayListeners.forEach((listener) => listener(event));
  }
}

class FakeAudioCommands {
  constructor() {
    this.commands = [];
  }

  unlock() { this.commands.push("unlock"); }
  playEffect(id) { this.commands.push(`effect:${id}`); return true; }
  playMusic(id) { this.commands.push(`music:${id}`); }
  pauseMusic() { this.commands.push("pause"); }
  stopMusic() { this.commands.push("stop"); }
  setMuted(isMuted) { this.commands.push(`mute:${isMuted}`); }
  setMusicVolume(volume) { this.commands.push(`music-volume:${volume}`); }
  setEffectsVolume(volume) { this.commands.push(`effects-volume:${volume}`); }
  destroy() { this.commands.push("destroy"); }
}

class MemoryStorage {
  constructor(data = null) {
    this.data = data;
  }

  getItem() {
    return this.data;
  }

  setItem(_key, value) {
    this.data = value;
  }
}

class FakeDomElement extends FakeHTMLElement {
  constructor(elements = {}) {
    super();
    this.elements = elements;
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = "";
    this.dataset = {};
    this.value = "";
  }

  querySelector(selector) {
    const element = this.elements[selector];
    return Array.isArray(element) ? element[0] ?? null : element ?? null;
  }

  querySelectorAll(selector) {
    const element = this.elements[selector];
    if (Array.isArray(element)) return element;
    return element ? [element] : [];
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  click() {
    this.listeners.get("click")?.();
  }

  dispatch(type) {
    this.listeners.get(type)?.({ target: this });
  }
}

class FakeInputElement extends FakeDomElement {}
class FakeOutputElement extends FakeDomElement {}
globalThis.HTMLInputElement = FakeInputElement;
globalThis.HTMLOutputElement = FakeOutputElement;

const createdAudio = [];
let now = 0;
const manager = new AudioManager({
  music: { climb: { source: "climb.wav", volume: 0.2 } },
  effects: {
    jump: {
      source: "jump.wav",
      volume: 0.5,
      maximumVoices: 2,
      minimumIntervalMilliseconds: 100,
    },
  },
}, (source) => {
  const audio = new FakeAudio(source);
  createdAudio.push(audio);
  return audio;
}, () => now).initialize();

manager.playMusic("climb");
assert.equal(createdAudio[0].playCount, 0);
assert.equal(manager.playEffect("jump"), false);
manager.unlock();
assert.equal(createdAudio[0].playCount, 1);
assert.equal(manager.playEffect("jump"), true);
assert.equal(manager.playEffect("jump"), false);
now = 100;
assert.equal(manager.playEffect("jump"), true);
now = 200;
assert.equal(manager.playEffect("jump"), false);
createdAudio[1].ended = true;
assert.equal(manager.playEffect("jump"), true);
manager.setMuted(true);
assert.equal(createdAudio[1].paused, true);
assert.equal(createdAudio[1].currentTime, 0);
now = 300;
assert.equal(manager.playEffect("jump"), false);
manager.setMuted(false);
assert.equal(createdAudio[0].playCount, 1);
manager.setMusicVolume(0.5);
manager.setEffectsVolume(0.4);
assert.equal(createdAudio[0].volume, 0.1);
assert.equal(createdAudio[1].volume, 0.2);
assert.throws(() => manager.setMusicVolume(Number.NaN), TypeError);
assert.throws(() => manager.playEffect("missing"), RangeError);

const eventHub = new GameplayEventHub();
const receivedEvents = [];
eventHub.on((event) => receivedEvents.push(event));
eventHub.emit(GAMEPLAY_EVENTS.PICKUP, { type: "gear" });
assert.equal(receivedEvents[0].detail.type, "gear");
assert.equal(Object.isFrozen(receivedEvents[0]), true);
assert.throws(() => eventHub.emit("missing"), TypeError);

const reporter = new WorldEventReporter(eventHub);
reporter.capture(
  createCharacterState(true, 0),
  { isActive: false, phase: 1 },
);
reporter.report(
  createCharacterState(false, -700),
  { isActive: true, phase: 1 },
);
assert.equal(receivedEvents.at(-2).type, GAMEPLAY_EVENTS.PLAYER_JUMP);
assert.equal(receivedEvents.at(-1).type, GAMEPLAY_EVENTS.BOSS_ACTIVATED);
reporter.capture(
  createCharacterState(false, 200),
  { isActive: true, phase: 1 },
);
reporter.report(
  createCharacterState(true, 0),
  { isActive: true, phase: 2 },
);
assert.equal(receivedEvents.at(-2).type, GAMEPLAY_EVENTS.PLAYER_LAND);
assert.equal(receivedEvents.at(-1).type, GAMEPLAY_EVENTS.BOSS_PHASE);

const enemy = {
  id: "enemy-1",
  type: "scrapCrawler",
  isDead: false,
  receivePlayerHit() {
    this.isDead = true;
    return true;
  },
};
assert.equal(reporter.damageEnemy(enemy, { amount: 25 }), true);
assert.equal(receivedEvents.at(-1).type, GAMEPLAY_EVENTS.ENEMY_DEFEATED);

const fakeGame = new FakeGame();
const fakeAudio = new FakeAudioCommands();
const fakeTarget = new FakeEventTarget();
const controller = new GameAudioController(
  fakeGame,
  fakeAudio,
  fakeTarget,
).initialize();
fakeTarget.dispatch("pointerdown");
fakeGame.setState(GAME_STATES.PLAYING);
fakeGame.emit(GAMEPLAY_EVENTS.PLAYER_ATTACK, { weaponId: "repairWrench" });
fakeGame.emit(GAMEPLAY_EVENTS.PICKUP, { type: "energy" });
fakeGame.emit(GAMEPLAY_EVENTS.BOSS_ACTIVATED);
controller.setMuted(true);
controller.setMuted(false);
fakeGame.setState(GAME_STATES.PAUSED);
controller.setMuted(false);
fakeGame.setState(GAME_STATES.PLAYING);
fakeGame.emit(GAMEPLAY_EVENTS.ENEMY_DEFEATED, { isBoss: true });
fakeGame.setState(GAME_STATES.WON);
assert.deepEqual(fakeAudio.commands, [
  "stop",
  "unlock",
  "music:climb",
  "effect:wrench",
  "effect:pickupEnergy",
  "effect:bossPhase",
  "music:boss",
  "mute:true",
  "mute:false",
  "music:boss",
  "pause",
  "mute:false",
  "music:boss",
  "effect:bossDeath",
  "stop",
  "effect:win",
]);
controller.destroy();
assert.equal(fakeGame.stateListeners.size, 0);
assert.equal(fakeGame.gameplayListeners.size, 0);

const muteButton = new FakeDomElement();
const scoreElement = new FakeDomElement();
const heightElement = new FakeDomElement();
const timeElement = new FakeDomElement();
const musicVolume = new FakeInputElement();
musicVolume.dataset.volumeControl = "music";
const effectsVolume = new FakeInputElement();
effectsVolume.dataset.volumeControl = "effects";
const musicOutput = new FakeOutputElement();
musicOutput.dataset.volumeOutput = "music";
const effectsOutput = new FakeOutputElement();
effectsOutput.dataset.volumeOutput = "effects";
const storageRoot = new FakeDomElement({
  '[data-ui-action="mute"]': muteButton,
  "[data-record-score]": scoreElement,
  "[data-record-height]": heightElement,
  "[data-record-time]": timeElement,
  "[data-volume-control]": [musicVolume, effectsVolume],
  "[data-volume-output]": [musicOutput, effectsOutput],
});
const savedStorage = new MemoryStorage(JSON.stringify({
  version: 1,
  bestScore: 123,
  maximumHeight: 45,
  bestTimeSeconds: 67,
  isMuted: true,
}));
const gameStorage = new GameStorage(savedStorage, {
  key: "test",
  version: 1,
});
const storageAudio = new FakeAudioCommands();
const storageGame = {
  onStateChange() { return () => {}; },
  getHudSnapshot() { return {}; },
};
new StorageController(
  storageGame,
  gameStorage,
  storageAudio,
  storageRoot,
).initialize();
assert.deepEqual(storageAudio.commands.slice(0, 3), [
  "music-volume:0.75",
  "effects-volume:0.85",
  "mute:true",
]);
assert.equal(muteButton.textContent, "Ton: aus");
assert.equal(muteButton.attributes.get("aria-pressed"), "true");
assert.equal(musicVolume.value, "75");
assert.equal(effectsOutput.textContent, "85 %");
musicVolume.value = "35";
musicVolume.dispatch("input");
assert.equal(JSON.parse(savedStorage.data).musicVolume, 35);
assert.equal(storageAudio.commands.at(-3), "music-volume:0.35");
muteButton.click();
assert.equal(storageAudio.commands.at(-1), "mute:false");
assert.equal(JSON.parse(savedStorage.data).isMuted, false);
assert.equal(muteButton.textContent, "Ton: an");
assert.equal(gameStorage.setVolume("effects", 150).effectsVolume, 100);
assert.equal(gameStorage.setVolume("music", -20).musicVolume, 0);
assert.throws(() => gameStorage.setVolume("unknown", 50), RangeError);

function createCharacterState(isOnGround, velocityY) {
  return {
    isOnGround,
    velocityY,
    jumpChargePercent: 0,
    jumpController: { isCharging: false },
  };
}

const audioDefinitions = [
  ...Object.values(GAME_CONFIG.audio.music),
  ...Object.values(GAME_CONFIG.audio.effects),
];
assert.equal(audioDefinitions.length, 18);
assert.ok(audioDefinitions.every((definition) => definition.volume <= 0.38));
audioDefinitions.forEach((definition) => {
  const relativePath = definition.source.replace(/^\.\//, "");
  const filePath = path.join(process.cwd(), relativePath);
  assert.equal(fs.existsSync(filePath), true, `Audiodatei fehlt: ${relativePath}`);
  const file = fs.readFileSync(filePath);
  assert.ok(file.length > 4_000, `Audiodatei ist zu klein: ${relativePath}`);
  const isOgg = file.subarray(0, 4).toString("ascii") === "OggS";
  const isMp3 = file.subarray(0, 3).toString("ascii") === "ID3" ||
    (file[0] === 0xff && (file[1] & 0xe0) === 0xe0);
  assert.ok(isOgg || isMp3, `Unbekanntes Audioformat: ${relativePath}`);
});

const credits = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "asset-credits.json"), "utf8"),
);
const licenseIds = new Set(credits.licenseProfiles.map((profile) => profile.id));
assert.ok(licenseIds.has("opengameart-cc0-audio"));
assert.ok(licenseIds.has("kenney-cc0-audio"));

console.log("QA-005: Audio, Einstellungen und gespeicherter Mute-Status bestanden.");
