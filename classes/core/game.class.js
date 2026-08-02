import { World } from "./world.class.js";
import { GameCanvas } from "./game-canvas.class.js";
import { GameLoop } from "./game-loop.class.js";
import { GameStateMachine, GAME_STATES } from "./game-state-machine.class.js";
import {
  GameplayEventHub,
  GAMEPLAY_EVENTS,
} from "./gameplay-event-hub.class.js";
import { Keyboard } from "../input/keyboard.class.js";
import { RunStats } from "../systems/run-stats.class.js";
import { createLevelOne } from "../../js/levels/level-01.js";
import { createGameCombatSystems } from "../../js/factories/game-combat-systems.js";

/**
 * Einstiegspunkt für Initialisierung und Lebenszyklus des Spiels.
 */
export class Game {
  #gameLoop;
  #stateMachine;
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Readonly<object>} config
   * @param {EventTarget} [inputTarget=globalThis]
   */
  constructor(canvas, config, inputTarget = globalThis) {
    this.gameCanvas = new GameCanvas(canvas);
    this.canvas = this.gameCanvas.element;
    this.context = this.gameCanvas.context;
    this.config = config;
    this.#initializeRuntime(inputTarget);
    Object.assign(this, createGameCombatSystems(config, this));
  }

  #initializeRuntime(inputTarget) {
    this.isInitialized = false;
    this.#stateMachine = new GameStateMachine();
    this.#stateMachine.onChange((state) => this.#reflectState(state));
    this.gameplayEvents = new GameplayEventHub();
    this.keyboard = new Keyboard(inputTarget);
    this.world = this.#createWorld();
    this.runStats = this.#createRunStats();
    this.#gameLoop = new GameLoop(
      this.config.timing.maximumDeltaTimeMilliseconds,
      (deltaTimeSeconds) => this.#processFrame(deltaTimeSeconds),
    );
  }

  /** @returns {boolean} Ob das Spiel gerade pausiert ist. */
  get isPaused() { return this.#stateMachine.is(GAME_STATES.PAUSED); }

  /** @returns {boolean} Ob der Animationsloop läuft. */
  get isRunning() { return this.#gameLoop.isRunning; }

  /** @returns {string} Der aktive Spielzustand. */
  get state() { return this.#stateMachine.getState(); }

  /** @returns {number} Bytes aktueller Höhenverlust in Weltpixeln. */
  get heightLossPixels() { return this.world.getHeightLossPixels(); }

  /**
   * Informiert einen Beobachter über spätere Zustandswechsel.
   * @param {(state: string) => void} listener
   * @returns {() => void} Funktion zum Abmelden.
   */
  onStateChange(listener) {
    return this.#stateMachine.onChange(listener);
  }

  /**
   * Informiert einen Beobachter über sichtbare Änderungen der Laufwerte.
   * @param {(snapshot: Readonly<object>) => void} listener
   * @returns {() => void} Funktion zum Abmelden.
   */
  onHudChange(listener) {
    return this.runStats.onChange(listener);
  }

  /**
   * Informiert einen Beobachter über einmalige Gameplay-Ereignisse.
   * @param {(event: Readonly<object>) => void} listener
   * @returns {() => void}
   */
  onGameplayEvent(listener) {
    return this.gameplayEvents.on(listener);
  }

  /**
   * Liefert die aktuellen Laufwerte als unveränderliche Momentaufnahme.
   * @returns {Readonly<object>}
   */
  getHudSnapshot() {
    return this.runStats.getSnapshot();
  }

  /** @returns {ReadonlyArray<Readonly<object>>} Aktuelle Verbesserungen. */
  getUpgradeOptions() { return this.upgradeFlow.getOptions(); }

  /** Liefert den Auslöser der aktuellen Upgrade-Auswahl. */
  getUpgradeContext() { return this.upgradeFlow.getContext(); }

  /**
   * Initialisiert Spielfläche und Hauptloop höchstens einmal.
   */
  initialize() {
    if (this.isInitialized) return;
    this.keyboard.bind();
    this.world.initialize();
    this.gameCanvas.clear();
    this.canvas.dataset.gameState = this.state;
    this.isInitialized = true;
    this.start();
  }

  /** Startet genau einen neuen Animationsloop. */
  start() {
    if (!this.#gameLoop.start()) return;
    this.gameCanvas.setLoopState("running");
  }

  /** Stoppt den Loop und verwirft seine Zeitbasis. */
  stop() {
    if (!this.#gameLoop.stop()) return;
    this.gameCanvas.setLoopState("stopped");
  }

  /**
   * Pausiert Updates, ohne einen zweiten Loop zu erzeugen.
   */
  pause() {
    if (!this.isRunning || !this.#isPlaying()) return false;
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.PAUSED);
    this.gameCanvas.setLoopState("paused");
    return true;
  }

  /**
   * Setzt den bestehenden Loop mit frischer Zeitbasis fort.
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return false;
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.PLAYING);
    this.gameCanvas.setLoopState("running");
    return true;
  }

  /**
   * Übernimmt eine angebotene Verbesserung und setzt den Lauf fort.
   * @param {string} upgradeId
   * @returns {boolean}
   */
  chooseUpgrade(upgradeId) {
    if (!this.#stateMachine.is(GAME_STATES.UPGRADING)) return false;
    if (!this.getUpgradeOptions().some(({ id }) => id === upgradeId)) return false;
    this.upgradeFlow.choose(upgradeId);
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.PLAYING);
    this.gameCanvas.setLoopState("running");
    return true;
  }

  /**
   * Wechselt zwischen Pause und laufendem Spiel.
   * @returns {boolean} Aktueller Pausenzustand.
   */
  togglePause() {
    if (this.isPaused) this.resume();
    else this.pause();
    return this.isPaused;
  }

  /**
   * Wechselt aus dem Home-Zustand ins Spiel.
   * @returns {boolean} Ob sich der Zustand geändert hat.
   */
  play() {
    if (!this.#stateMachine.is(GAME_STATES.HOME)) return false;
    const changed = this.#setGameState(GAME_STATES.PLAYING);
    if (!this.isRunning) this.start();
    return changed;
  }

  /**
   * Friert die Welt nach einem Sieg ein.
   * @returns {boolean}
   */
  win() { return this.#finishGame(GAME_STATES.WON); }

  /**
   * Friert die Welt nach einer Niederlage ein.
   * @returns {boolean}
   */
  lose() { return this.#finishGame(GAME_STATES.LOST); }

  /**
   * Verarbeitet einen Treffer über Energie, Rückstoß und möglichen Tod.
   * @param {Readonly<{amount:number, direction:number}>} hit
   * @returns {boolean} Ob Byte den Treffer angenommen hat.
   */
  takeDamage(hit) {
    if (!this.#isPlaying()) return false;
    const character = this.world.character;
    const accepted = this.combatSystem.applyHit(hit, character, this.runStats);
    if (!accepted) return false;
    this.gameplayEvents.emit(GAMEPLAY_EVENTS.PLAYER_HURT);
    if (character?.isDead) {
      this.gameplayEvents.emit(GAMEPLAY_EVENTS.PLAYER_DEATH);
      this.lose();
    }
    return accepted;
  }

  /**
   * Kehrt in den Home-Zustand zurück.
   * @returns {boolean}
   */
  goHome() {
    if (this.#stateMachine.is(GAME_STATES.HOME)) return false;
    this.keyboard.reset();
    const changed = this.#setGameState(GAME_STATES.HOME);
    this.gameCanvas.setLoopState(this.isRunning ? "running" : "stopped");
    return changed;
  }

  /**
   * Erzeugt ohne Seitenreload eine vollständig frische Spielwelt.
   */
  reset() {
    this.world.destroy();
    this.keyboard.reset();
    this.world = this.#createWorld();
    this.world.initialize();
    this.runStats.reset(this.world.level?.playerStart?.y ?? 0);
    this.weaponSystem.reset();
    this.combatSystem.reset();
    this.upgradeFlow.reset();
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.PLAYING);
    this.gameCanvas.setLoopState("running");
    if (!this.isRunning) this.start();
  }

  #processFrame(deltaTime) {
    this.#handleStateInput();
    if (this.#isPlaying()) this.update(deltaTime);
    this.draw();
  }

  /**
   * Aktualisiert alle Spielsysteme zeitbasiert.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    const attack = this.weaponSystem.update(deltaTimeSeconds, this.world.character);
    this.world.handlePlayerAttack(attack);
    this.world.update(deltaTimeSeconds);
    this.#updateRunStats(deltaTimeSeconds);
    this.world.takeDamageEvents().forEach((hit) => this.takeDamage(hit));
    if (this.world.isCharacterInDeathZone()) this.#handleDeathZone();
    if (this.world.bossFight.takeVictory()) this.win();
    this.#openWaveUpgrade();
  }

  /** Zeichnet den aktuellen Spielzustand. */
  draw() {
    this.gameCanvas.clear();
    this.world.draw();
  }

  /**
   * Erstellt eine neue Welt mit denselben festen Abhängigkeiten.
   * @returns {World}
   */
  #createWorld() {
    return new World(
      this.context,
      this.config,
      this.keyboard,
      createLevelOne(this.config.enemies),
      this.gameplayEvents,
    );
  }

  /**
   * Erstellt frische Laufwerte passend zum aktuellen Levelstart.
   * @returns {RunStats}
   */
  #createRunStats() {
    const startY = this.world.level?.playerStart?.y ?? 0;
    return new RunStats(this.config.hud, startY);
  }

  /**
   * Wechselt den Zustand und spiegelt ihn am Canvas.
   * @param {string} nextState
   * @returns {boolean}
   */
  #setGameState(nextState) {
    return this.#stateMachine.transitionTo(nextState);
  }

  #reflectState(state) {
    this.canvas.dataset.gameState = state;
  }

  /**
   * Überträgt Weltposition und neue Funde in die Laufwerte.
   */
  #updateRunStats(deltaTimeSeconds) {
    this.runStats.updateTime(deltaTimeSeconds, this.world.getHeightLossPixels());
    this.runStats.updateHeight(this.world.character?.y);
    this.runStats.applyPickups(this.world.takeCollectedPickups());
    this.runStats.applyEnemyDefeats(this.world.takeDefeatedEnemies());
    this.runStats.updateBoss(this.world.bossFight.getSnapshot());
  }

  /** Verarbeitet zustandsübergreifende Eingaben. */
  #handleStateInput() {
    if (this.keyboard.consumePress("pause")) this.togglePause();
  }

  #openWaveUpgrade() {
    if (!this.#isPlaying() || !this.upgradeFlow.openFrom(this.world)) return;
    this.keyboard.reset();
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.UPGRADING);
    this.gameCanvas.setLoopState("paused");
  }

  /** @returns {boolean} Ob die Welt aktualisiert werden darf. */
  #isPlaying() {
    return this.#stateMachine.is(GAME_STATES.PLAYING);
  }

  /**
   * Setzt einen Endzustand nur aus dem laufenden Spiel.
   * @param {string} endState
   * @returns {boolean}
   */
  #finishGame(endState) {
    if (!this.#isPlaying()) return false;
    this.runStats.finalizeScore(endState === GAME_STATES.WON);
    this.keyboard.reset();
    this.gameCanvas.setLoopState("paused");
    return this.#setGameState(endState);
  }

  #handleDeathZone() {
    if (this.world.character?.die()) {
      this.gameplayEvents.emit(GAMEPLAY_EVENTS.PLAYER_DEATH);
    }
    this.lose();
  }
}
