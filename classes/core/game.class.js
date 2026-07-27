import { World } from "./world.class.js";
import { GameStateMachine, GAME_STATES } from "./game-state-machine.class.js";
import { Keyboard } from "../input/keyboard.class.js";
import { RunStats } from "../systems/run-stats.class.js";
import { CombatSystem } from "../systems/combat-system.class.js";
import { WeaponSystem } from "../systems/weapon-system.class.js";
import { createLevelOne } from "../../js/levels/level-01.js";

/**
 * Einstiegspunkt für Initialisierung und Lebenszyklus des Spiels.
 */
export class Game {
  #stateMachine;
  #stateListeners;

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Readonly<object>} config
   * @param {EventTarget} [inputTarget=globalThis]
   */
  constructor(canvas, config, inputTarget = globalThis) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.config = config;
    this.isInitialized = false;
    this.isRunning = false;
    this.animationFrameId = null;
    this.previousTimestamp = null;
    this.boundGameLoop = this.gameLoop.bind(this);
    this.validateContext();
    this.#stateMachine = new GameStateMachine();
    this.#stateListeners = new Set();
    this.keyboard = new Keyboard(inputTarget);
    this.world = this.#createWorld();
    this.runStats = this.#createRunStats();
    this.combatSystem = new CombatSystem(config.combat);
    this.weaponSystem = new WeaponSystem(config.weapons, this.keyboard, this.runStats);
  }

  /**
   * Zeigt, ob das Spiel gerade pausiert ist.
   * @returns {boolean}
   */
  get isPaused() {
    return this.#stateMachine.is(GAME_STATES.PAUSED);
  }

  /**
   * Liefert den aktiven Spielzustand.
   * @returns {string}
   */
  get state() {
    return this.#stateMachine.getState();
  }

  /**
   * Liefert Bytes aktuellen Höhenverlust in Weltpixeln.
   * @returns {number}
   */
  get heightLossPixels() {
    return this.world.getHeightLossPixels();
  }

  /**
   * Informiert einen Beobachter über spätere Zustandswechsel.
   * @param {(state: string) => void} listener
   * @returns {() => void} Funktion zum Abmelden.
   */
  onStateChange(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Der Zustandsbeobachter muss eine Funktion sein.");
    }
    this.#stateListeners.add(listener);
    return () => this.#stateListeners.delete(listener);
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
   * Liefert die aktuellen Laufwerte als unveränderliche Momentaufnahme.
   * @returns {Readonly<object>}
   */
  getHudSnapshot() {
    return this.runStats.getSnapshot();
  }

  /**
   * Initialisiert Spielfläche und Hauptloop höchstens einmal.
   */
  initialize() {
    if (this.isInitialized) return;
    this.keyboard.bind();
    this.world.initialize();
    this.configureRendering();
    this.clearCanvas();
    this.canvas.dataset.gameState = this.state;
    this.isInitialized = true;
    this.start();
  }

  /**
   * Startet genau einen neuen Animationsloop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.previousTimestamp = null;
    this.setLoopState("running");
    this.requestNextFrame();
  }

  /**
   * Stoppt den Loop und verwirft seine Zeitbasis.
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.cancelScheduledFrame();
    this.previousTimestamp = null;
    this.setLoopState("stopped");
  }

  /**
   * Pausiert Updates, ohne einen zweiten Loop zu erzeugen.
   */
  pause() {
    if (!this.isRunning || !this.#isPlaying()) return false;
    this.previousTimestamp = null;
    this.#setGameState(GAME_STATES.PAUSED);
    this.setLoopState("paused");
    return true;
  }

  /**
   * Setzt den bestehenden Loop mit frischer Zeitbasis fort.
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return false;
    this.previousTimestamp = null;
    this.#setGameState(GAME_STATES.PLAYING);
    this.setLoopState("running");
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
  win() {
    return this.#finishGame(GAME_STATES.WON);
  }

  /**
   * Friert die Welt nach einer Niederlage ein.
   * @returns {boolean}
   */
  lose() {
    return this.#finishGame(GAME_STATES.LOST);
  }

  /**
   * Verarbeitet einen Treffer über Energie, Rückstoß und möglichen Tod.
   * @param {Readonly<{amount:number, direction:number}>} hit
   * @returns {boolean} Ob Byte den Treffer angenommen hat.
   */
  takeDamage(hit) {
    if (!this.#isPlaying()) return false;
    const character = this.world.character;
    const accepted = this.combatSystem.applyHit(hit, character, this.runStats);
    if (character?.isDead) this.lose();
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
    this.setLoopState(this.isRunning ? "running" : "stopped");
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
    this.previousTimestamp = null;
    this.#setGameState(GAME_STATES.PLAYING);
    this.setLoopState("running");
    if (!this.isRunning) this.start();
  }

  /**
   * Verarbeitet einen Frame und plant genau einen Folgeframe.
   * @param {DOMHighResTimeStamp} timestamp
   */
  gameLoop(timestamp) {
    if (!this.isRunning) return;
    this.animationFrameId = null;
    const deltaTime = this.calculateDeltaTime(timestamp);
    this.previousTimestamp = timestamp;
    this.#handleStateInput();
    if (this.#isPlaying()) this.update(deltaTime);
    this.draw();
    this.requestNextFrame();
  }

  /**
   * Aktualisiert alle Spielsysteme zeitbasiert.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    const attack = this.weaponSystem.update(deltaTimeSeconds, this.world.character);
    this.world.handlePlayerAttack(attack);
    this.world.update(deltaTimeSeconds);
    this.#updateRunStats();
    this.world.takeDamageEvents().forEach((hit) => this.takeDamage(hit));
    if (this.world.isCharacterInDeathZone()) this.#handleDeathZone();
  }

  /**
   * Zeichnet den aktuellen Spielzustand.
   */
  draw() {
    this.clearCanvas();
    this.world.draw();
  }

  /**
   * Begrenzt große Zeitsprünge und liefert Sekunden.
   * @param {DOMHighResTimeStamp} timestamp
   * @returns {number}
   */
  calculateDeltaTime(timestamp) {
    if (this.previousTimestamp === null) return 0;
    const elapsed = Math.max(0, timestamp - this.previousTimestamp);
    const maximum = this.config.timing.maximumDeltaTimeMilliseconds;
    return Math.min(elapsed, maximum) / 1000;
  }

  /**
   * Plant einen Frame nur, wenn noch keiner aussteht.
   */
  requestNextFrame() {
    if (!this.isRunning || this.animationFrameId !== null) return;
    this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
  }

  /**
   * Verwirft einen noch nicht ausgeführten Frame.
   */
  cancelScheduledFrame() {
    if (this.animationFrameId === null) return;
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  /**
   * Leert die sichtbare Spielfläche.
   */
  clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Bewahrt beim Skalieren die klaren Kanten der Pixelgrafiken.
   */
  configureRendering() {
    this.context.imageSmoothingEnabled = false;
  }

  /**
   * Spiegelt den Loopzustand für UI und Tests am Canvas.
   * @param {"running"|"paused"|"stopped"} state
   */
  setLoopState(state) {
    this.canvas.dataset.gameLoopState = state;
  }

  /**
   * Erstellt eine neue Welt mit denselben festen Abhängigkeiten.
   * @returns {World}
   */
  #createWorld() {
    return new World(this.context, this.config, this.keyboard, createLevelOne());
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
    const changed = this.#stateMachine.transitionTo(nextState);
    this.canvas.dataset.gameState = this.state;
    if (changed) this.#notifyStateChange();
    return changed;
  }

  /**
   * Meldet den aktuellen Zustand an alle registrierten Beobachter.
   */
  #notifyStateChange() {
    this.#stateListeners.forEach((listener) => listener(this.state));
  }

  /**
   * Überträgt Weltposition und neue Funde in die Laufwerte.
   */
  #updateRunStats() {
    this.runStats.updateHeight(this.world.character?.y);
    this.runStats.applyPickups(this.world.takeCollectedPickups());
  }

  /**
   * Verarbeitet zustandsübergreifende Eingaben.
   */
  #handleStateInput() {
    if (this.keyboard.consumePress("pause")) this.togglePause();
  }

  /**
   * Prüft, ob die Welt aktualisiert werden darf.
   * @returns {boolean}
   */
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
    this.keyboard.reset();
    return this.#setGameState(endState);
  }

  #handleDeathZone() {
    this.world.character?.die();
    this.lose();
  }

  /**
   * Bricht kontrolliert ab, falls kein 2D-Kontext verfügbar ist.
   */
  validateContext() {
    if (this.context) return;
    throw new Error("Der 2D-Canvas-Kontext ist nicht verfügbar.");
  }
}
