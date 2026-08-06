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
import { RunStatsSynchronizer } from
  "../systems/run-stats-synchronizer.class.js";

/**
 * Entry point for game initialization and lifecycle management.
 */
export class Game {
  #gameLoop;
  #runResetController;
  #runStatsSynchronizer;
  #stateMachine;
  #dependencies;
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Readonly<object>} config
   * @param {EventTarget} inputTarget
   * @param {Readonly<{
   *   levelSelection: import("./level-selection.class.js").LevelSelection,
   *   createCombatSystems: (config:Readonly<object>, game:Game) => Readonly<object>,
   *   createResetController: (game:Game, createWorld:() => World) => object
   * }>} dependencies
   */
  constructor(canvas, config, inputTarget, dependencies) {
    this.gameCanvas = new GameCanvas(canvas);
    this.canvas = this.gameCanvas.element;
    this.context = this.gameCanvas.context;
    this.config = config;
    this.#dependencies = dependencies;
    this.#initializeRuntime(inputTarget);
    this.#initializeCombatSystems(dependencies.createCombatSystems(config, this));
    this.#initializeResetController(dependencies);
  }

  /** Initializes combat systems. */
  #initializeCombatSystems(systems) {
    this.combatSystem = systems.combatSystem;
    this.weaponSystem = systems.weaponSystem;
    this.upgradeFlow = systems.upgradeFlow;
  }

  /** Initializes reset controller. */
  #initializeResetController(dependencies) {
    this.#runResetController = dependencies.createResetController(
      this, () => this.#createWorld(),
    );
  }

  /** Initializes runtime. */
  #initializeRuntime(inputTarget) {
    this.isInitialized = false;
    this.#stateMachine = new GameStateMachine();
    this.#stateMachine.onChange((state) => this.#reflectState(state));
    this.gameplayEvents = new GameplayEventHub();
    this.keyboard = new Keyboard(inputTarget);
    this.world = this.#createWorld();
    this.runStats = this.#createRunStats();
    this.#runStatsSynchronizer = new RunStatsSynchronizer(this.runStats);
    this.#gameLoop = new GameLoop(
      this.config.timing.maximumDeltaTimeMilliseconds,
      (deltaTimeSeconds) => this.#processFrame(deltaTimeSeconds),
    );
  }

  /** @returns {boolean} Whether the game is currently paused. */
  get isPaused() { return this.#stateMachine.is(GAME_STATES.PAUSED); }

  /** @returns {boolean} Whether the animation loop is running. */
  get isRunning() { return this.#gameLoop.isRunning; }

  /** @returns {string} The active game state. */
  get state() { return this.#stateMachine.getState(); }

  /** @returns {string} The active level identifier. */
  get levelId() { return this.#dependencies.levelSelection.activeLevelId; }

  /**
   * @param {string} levelId
   * @returns {boolean} Whether a level can be started.
   */
  isLevelAvailable(levelId) {
    return this.#dependencies.levelSelection.hasLevel(levelId);
  }

  /** @returns {number} Byte's current height loss in world pixels. */
  get heightLossPixels() { return this.world.getHeightLossPixels(); }

  /**
   * Notifies an observer about future state changes.
   * @param {(state: string) => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  onStateChange(listener) {
    return this.#stateMachine.onChange(listener);
  }

  /**
   * Notifies an observer about visible changes to the run values.
   * @param {(snapshot: Readonly<object>) => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  onHudChange(listener) {
    return this.runStats.onChange(listener);
  }

  /**
   * Notifies an observer about one-time gameplay events.
   * @param {(event: Readonly<object>) => void} listener
   * @returns {() => void}
   */
  onGameplayEvent(listener) {
    return this.gameplayEvents.on(listener);
  }

  /**
   * Returns the current run values as an immutable snapshot.
   * @returns {Readonly<object>}
   */
  getHudSnapshot() {
    return this.runStats.getSnapshot();
  }

  /** @returns {ReadonlyArray<Readonly<object>>} Current upgrades. */
  getUpgradeOptions() { return this.upgradeFlow.getOptions(); }

  /** Returns the trigger for the current upgrade selection. */
  getUpgradeContext() { return this.upgradeFlow.getContext(); }

  /**
   * Initializes the game surface and main loop at most once.
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

  /** Starts exactly one new animation loop. */
  start() {
    if (!this.#gameLoop.start()) return;
    this.gameCanvas.setLoopState("running");
  }

  /** Stops the loop and discards its time base. */
  stop() {
    if (!this.#gameLoop.stop()) return;
    this.gameCanvas.setLoopState("stopped");
  }

  /** Stops the game and releases browser-facing runtime resources. */
  destroy() {
    this.stop();
    this.keyboard.unbind();
    this.world.destroy();
    this.gameCanvas.clear();
    this.isInitialized = false;
  }

  /**
   * Pauses updates without creating a second loop.
   */
  pause() {
    if (!this.isRunning || !this.#isPlaying()) return false;
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.PAUSED);
    this.gameCanvas.setLoopState("paused");
    return true;
  }

  /**
   * Resumes the existing loop with a fresh time base.
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return false;
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.PLAYING);
    this.gameCanvas.setLoopState("running");
    return true;
  }

  /**
   * Applies an offered upgrade and resumes the run.
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
   * Toggles between paused and active gameplay.
   * @returns {boolean} Current pause state.
   */
  togglePause() {
    if (this.isPaused) this.resume();
    else this.pause();
    return this.isPaused;
  }

  /**
   * Transitions from the home state into gameplay.
   * @returns {boolean} Whether the state changed.
   */
  play() {
    if (!this.#stateMachine.is(GAME_STATES.HOME)) return false;
    const changed = this.#setGameState(GAME_STATES.PLAYING);
    if (!this.isRunning) this.start();
    return changed;
  }

  /**
   * Selects and starts a fresh level from the home screen.
   * @param {string} levelId
   * @returns {boolean} Whether a level was started.
   */
  startLevel(levelId) {
    if (!this.#stateMachine.is(GAME_STATES.HOME)) return false;
    this.#dependencies.levelSelection.select(levelId);
    this.reset();
    return true;
  }

  /**
   * Freezes the world after a victory.
   * @returns {boolean}
   */
  win() { return this.#finishGame(GAME_STATES.WON); }

  /**
   * Freezes the world after a defeat.
   * @returns {boolean}
   */
  lose() { return this.#finishGame(GAME_STATES.LOST); }

  /**
   * Processes a hit through energy loss, knockback, and possible death.
   * @param {Readonly<{amount:number, direction:number}>} hit
   * @returns {boolean} Whether Byte accepted the hit.
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
   * Returns to the home state.
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
   * Creates a completely fresh game world without reloading the page.
   */
  reset() {
    this.#runResetController.restart(this.world);
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.PLAYING);
    this.gameCanvas.setLoopState("running");
    if (!this.isRunning) this.start();
  }

  /** Updates process frame. */
  #processFrame(deltaTime) {
    this.#handleStateInput();
    if (this.#isPlaying()) this.update(deltaTime);
    this.draw();
  }

  /**
   * Updates all game systems over time.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    const attack = this.weaponSystem.update(deltaTimeSeconds, this.world.character);
    this.world.handlePlayerAttack(attack);
    this.world.update(deltaTimeSeconds);
    this.#runStatsSynchronizer.update(deltaTimeSeconds, this.world);
    this.world.takeDamageEvents().forEach((hit) => this.takeDamage(hit));
    if (this.world.isCharacterInDeathZone()) this.#handleDeathZone();
    if (this.world.bossFight.takeVictory()) this.win();
    this.#openWaveUpgrade();
  }

  /** Draws the current game state. */
  draw() {
    this.gameCanvas.clear();
    this.world.draw();
  }

  /**
   * Creates a new world with the same fixed dependencies.
   * @returns {World}
   */
  #createWorld() {
    return new World(
      this.context,
      this.config,
      this.keyboard,
      this.#dependencies.levelSelection.createLevel(),
      this.gameplayEvents,
    );
  }

  /**
   * Creates fresh run values for the current level start.
   * @returns {RunStats}
   */
  #createRunStats() {
    const startY = this.world.level?.playerStart?.y ?? 0;
    return new RunStats(this.config.hud, startY);
  }

  /**
   * Changes the state and mirrors it on the canvas.
   * @param {string} nextState
   * @returns {boolean}
   */
  #setGameState(nextState) {
    return this.#stateMachine.transitionTo(nextState);
  }

  /** Performs the reflect state operation. */
  #reflectState(state) {
    this.canvas.dataset.gameState = state;
  }

  /** Processes input that applies across game states. */
  #handleStateInput() {
    if (this.keyboard.consumePress("pause")) this.togglePause();
  }

  /** Performs the open wave upgrade operation. */
  #openWaveUpgrade() {
    if (!this.#isPlaying() || !this.upgradeFlow.openFrom(this.world)) return;
    this.keyboard.reset();
    this.#gameLoop.resetClock();
    this.#setGameState(GAME_STATES.UPGRADING);
    this.gameCanvas.setLoopState("paused");
  }

  /** @returns {boolean} Whether the world may be updated. */
  #isPlaying() {
    return this.#stateMachine.is(GAME_STATES.PLAYING);
  }

  /**
   * Sets an end state only from active gameplay.
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

  /** Handles death zone. */
  #handleDeathZone() {
    if (this.world.character?.die()) {
      this.gameplayEvents.emit(GAMEPLAY_EVENTS.PLAYER_DEATH);
    }
    this.lose();
  }
}
