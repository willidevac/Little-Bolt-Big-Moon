/**
 * Schedules animation frames and provides a capped elapsed frame time.
 */
export class GameLoop {
  #animationFrameId;
  #boundFrame;
  #cancelFrame;
  #isRunning;
  #maximumDeltaTimeMilliseconds;
  #onFrame;
  #previousTimestamp;
  #requestFrame;

  /**
   * @param {number} maximumDeltaTimeMilliseconds
   * @param {(deltaTimeSeconds:number) => void} onFrame
   * @param {Readonly<object>} [frameTarget=globalThis]
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

  #runFrame(timestamp) {
    if (!this.#isRunning) return;
    this.#animationFrameId = null;
    const deltaTimeSeconds = this.#calculateDeltaTime(timestamp);
    this.#previousTimestamp = timestamp;
    this.#onFrame(deltaTimeSeconds);
    this.#requestNextFrame();
  }

  #calculateDeltaTime(timestamp) {
    if (this.#previousTimestamp === null) return 0;
    const elapsed = Math.max(0, timestamp - this.#previousTimestamp);
    return Math.min(elapsed, this.#maximumDeltaTimeMilliseconds) / 1000;
  }

  #requestNextFrame() {
    if (!this.#isRunning || this.#animationFrameId !== null) return;
    this.#animationFrameId = this.#requestFrame(this.#boundFrame);
  }

  #cancelScheduledFrame() {
    if (this.#animationFrameId === null) return;
    this.#cancelFrame(this.#animationFrameId);
    this.#animationFrameId = null;
  }

  #resetRuntime() {
    this.#isRunning = false;
    this.#animationFrameId = null;
    this.#previousTimestamp = null;
  }

  #validateConfig(maximumDelta, onFrame, frameTarget) {
    const hasDelta = Number.isFinite(maximumDelta) && maximumDelta > 0;
    const hasCallback = typeof onFrame === "function";
    const hasScheduler = typeof frameTarget?.requestAnimationFrame === "function" &&
      typeof frameTarget?.cancelAnimationFrame === "function";
    if (hasDelta && hasCallback && hasScheduler) return;
    throw new TypeError("Die Konfiguration des Animationsloops ist ungültig.");
  }
}
