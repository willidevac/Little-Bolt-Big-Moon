/**
 * Schedules animation frames and provides a capped elapsed frame time.
 */
export class GameLoop {
  /** @type {number|null} */
  #animationFrameId = null;
  /** @type {FrameRequestCallback} */
  #boundFrame;
  /** @type {(handle:number) => void} */
  #cancelFrame;
  /** @type {boolean} */
  #isRunning = false;
  /** @type {number} */
  #maximumDeltaTimeMilliseconds;
  /** @type {(deltaTimeSeconds:number) => void} */
  #onFrame;
  /** @type {number|null} */
  #previousTimestamp = null;
  /** @type {(callback:FrameRequestCallback) => number} */
  #requestFrame;

  /**
   * Creates the configured instance.
   * @param {number} maximumDeltaTimeMilliseconds Maximum accepted frame duration, in milliseconds.
   * @param {(deltaTimeSeconds:number) => void} onFrame Callback invoked for every animation frame.
   * @param {Pick<Window, "requestAnimationFrame"|"cancelAnimationFrame">} [frameTarget=globalThis] Animation-frame provider used by the loop.
   */
  constructor(maximumDeltaTimeMilliseconds, onFrame, frameTarget = globalThis) {
    this.#validateConfig(maximumDeltaTimeMilliseconds, onFrame, frameTarget);
    this.#maximumDeltaTimeMilliseconds = maximumDeltaTimeMilliseconds;
    this.#onFrame = onFrame;
    this.#requestFrame = frameTarget.requestAnimationFrame.bind(frameTarget);
    this.#cancelFrame = frameTarget.cancelAnimationFrame.bind(frameTarget);
    this.#boundFrame = this.#runFrame.bind(this);
    this.#resetRuntime();
  }

  /** @returns {boolean} Whether the animation loop is running. */
  get isRunning() { return this.#isRunning; }

  /** @returns {boolean} Whether a new loop was started. */
  start() {
    if (this.#isRunning) return false;
    this.#isRunning = true;
    this.resetClock();
    this.#requestNextFrame();
    return true;
  }

  /** @returns {boolean} Whether a running loop was stopped. */
  stop() {
    if (!this.#isRunning) return false;
    this.#isRunning = false;
    this.#cancelScheduledFrame();
    this.resetClock();
    return true;
  }

  /** Discards the previous time base for the next frame. */
  resetClock() {
    this.#previousTimestamp = null;
  }

  /**
   * Runs run frame with validated inputs.
   * @param {number} timestamp Animation-frame timestamp in milliseconds.
   */
  #runFrame(timestamp) {
    if (!this.#isRunning) return;
    this.#animationFrameId = null;
    const deltaTimeSeconds = this.#calculateDeltaTime(timestamp);
    this.#previousTimestamp = timestamp;
    this.#onFrame(deltaTimeSeconds);
    this.#requestNextFrame();
  }

  /**
   * Runs calculate delta time with validated inputs.
   * @param {number} timestamp Animation-frame timestamp in milliseconds.
   */
  #calculateDeltaTime(timestamp) {
    if (this.#previousTimestamp === null) return 0;
    const elapsed = Math.max(0, timestamp - this.#previousTimestamp);
    return Math.min(elapsed, this.#maximumDeltaTimeMilliseconds) / 1000;
  }

  /** Performs the request next frame operation. */
  #requestNextFrame() {
    if (!this.#isRunning || this.#animationFrameId !== null) return;
    this.#animationFrameId = this.#requestFrame(this.#boundFrame);
  }

  /** Cancels the scheduled animation frame when present. */
  #cancelScheduledFrame() {
    if (this.#animationFrameId === null) return;
    this.#cancelFrame(this.#animationFrameId);
    this.#animationFrameId = null;
  }

  /** Clears runtime. */
  #resetRuntime() {
    this.#isRunning = false;
    this.#animationFrameId = null;
    this.#previousTimestamp = null;
  }

  /**
   * Runs validate config with validated inputs.
   * @param {number} maximumDelta Maximum accepted frame duration.
   * @param {(deltaTimeSeconds:number) => void} onFrame Callback invoked for every animation frame.
   * @param {Pick<Window, "requestAnimationFrame"|"cancelAnimationFrame">} frameTarget Animation-frame provider used by the loop.
   */
  #validateConfig(maximumDelta, onFrame, frameTarget) {
    const hasDelta = Number.isFinite(maximumDelta) && maximumDelta > 0;
    const hasCallback = typeof onFrame === "function";
    const hasScheduler = typeof frameTarget?.requestAnimationFrame === "function" &&
      typeof frameTarget?.cancelAnimationFrame === "function";
    if (hasDelta && hasCallback && hasScheduler) return;
    throw new TypeError("Die Konfiguration des Animationsloops ist ungültig.");
  }
}
