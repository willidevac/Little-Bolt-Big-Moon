import { World } from "./world.class.js";
import { Keyboard } from "../input/keyboard.class.js";

/**
 * Einstiegspunkt für Initialisierung und Lebenszyklus des Spiels.
 */
export class Game {
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
    this.isPaused = false;
    this.animationFrameId = null;
    this.previousTimestamp = null;
    this.boundGameLoop = this.gameLoop.bind(this);
    this.validateContext();
    this.keyboard = new Keyboard(inputTarget);
    this.world = new World(this.context, this.config, this.keyboard);
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
    this.canvas.dataset.gameState = "initialized";
    this.isInitialized = true;
    this.start();
  }

  /**
   * Startet genau einen neuen Animationsloop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
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
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.previousTimestamp = null;
    this.setLoopState("paused");
  }

  /**
   * Setzt den bestehenden Loop mit frischer Zeitbasis fort.
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.previousTimestamp = null;
    this.setLoopState("running");
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
   * Verarbeitet einen Frame und plant genau einen Folgeframe.
   * @param {DOMHighResTimeStamp} timestamp
   */
  gameLoop(timestamp) {
    if (!this.isRunning) return;
    this.animationFrameId = null;
    const deltaTime = this.calculateDeltaTime(timestamp);
    this.previousTimestamp = timestamp;
    if (!this.isPaused) this.update(deltaTime);
    this.draw();
    this.requestNextFrame();
  }

  /**
   * Aktualisiert alle Spielsysteme zeitbasiert.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    this.world.update(deltaTimeSeconds);
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
   * Bricht kontrolliert ab, falls kein 2D-Kontext verfügbar ist.
   */
  validateContext() {
    if (this.context) return;
    throw new Error("Der 2D-Canvas-Kontext ist nicht verfügbar.");
  }
}
