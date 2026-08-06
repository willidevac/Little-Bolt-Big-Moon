const FRAME_TIME_EPSILON_SECONDS = 1e-9;

/**
 * Selects sprite frames based on a state and elapsed game time.
 */
export class AnimationController {
  /**
   * Creates the configured system.
   * @param {Readonly<Record<string, Readonly<object>>>} clips Animation clips keyed by state identifier.
   */
  constructor(clips) {
    if (!this.#areValidClips(clips)) {
      throw new TypeError("Die Animationsclips sind ungültig.");
    }
    this.clips = clips;
    this.state = null;
    this.frameOffset = 0;
    this.elapsedSeconds = 0;
  }

  /**
   * Restarts a clip only when the state changes.
   * @param {string} state State used while set state.
   * @returns {number} The first or current frame of the clip.
   */
  setState(state) {
    this.#getClip(state);
    if (this.state === state) return this.getCurrentFrameIndex();
    this.state = state;
    this.frameOffset = 0;
    this.elapsedSeconds = 0;
    return this.getCurrentFrameIndex();
  }

  /**
   * Processes elapsed game time and returns the visible sprite frame.
   * @param {string} state State used while update.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @returns {number}
   */
  update(state, deltaTimeSeconds) {
    this.setState(state);
    if (!this.#isValidDeltaTime(deltaTimeSeconds)) {
      return this.getCurrentFrameIndex();
    }
    this.#advance(deltaTimeSeconds);
    return this.getCurrentFrameIndex();
  }

  /**
   * Returns the absolute frame index of the current clip.
   * @returns {number}
   */
  getCurrentFrameIndex() {
    const clip = this.#getClip(this.state);
    return clip.startFrame + this.frameOffset;
  }

  /**
   * Updates advance.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #advance(deltaTimeSeconds) {
    const clip = this.#getClip(this.state);
    if (clip.frameCount === 1 || this.#hasFinished(clip)) return;
    this.elapsedSeconds += deltaTimeSeconds;
    const frameSteps = this.#getCompletedFrameSteps(clip);
    if (frameSteps === 0) return;
    this.elapsedSeconds = Math.max(
      0,
      this.elapsedSeconds - frameSteps * clip.frameDurationSeconds,
    );
    this.#applyFrameSteps(frameSteps, clip);
  }

  /**
   * Returns completed frame steps.
   * @param {Readonly<object>} clip Animation clip used for the requested state.
   */
  #getCompletedFrameSteps(clip) {
    return Math.floor(
      (this.elapsedSeconds + FRAME_TIME_EPSILON_SECONDS) / clip.frameDurationSeconds,
    );
  }

  /**
   * Applies frame steps.
   * @param {ReadonlyArray<object>} frameSteps Frame steps used while apply frame steps.
   * @param {Readonly<object>} clip Animation clip used for the requested state.
   */
  #applyFrameSteps(frameSteps, clip) {
    const nextOffset = this.frameOffset + frameSteps;
    this.frameOffset = clip.loop
      ? nextOffset % clip.frameCount
      : Math.min(nextOffset, clip.frameCount - 1);
  }

  /**
   * Checks the finished condition.
   * @param {Readonly<object>} clip Animation clip used for the requested state.
   */
  #hasFinished(clip) {
    return !clip.loop && this.frameOffset === clip.frameCount - 1;
  }

  /**
   * Returns clip.
   * @param {Readonly<object>} state State used while get clip.
   */
  #getClip(state) {
    const clip = this.clips[state];
    if (!clip) throw new RangeError(`Unbekannter Animationszustand: ${state}`);
    return clip;
  }

  /**
   * Performs the are valid clips operation.
   * @param {Readonly<Record<string, Readonly<object>>>} clips Animation clips keyed by state identifier.
   */
  #areValidClips(clips) {
    if (!clips || typeof clips !== "object") return false;
    const entries = Object.entries(clips);
    return entries.length > 0 && entries.every(([state, clip]) => {
      return this.#isValidClip(state, clip);
    });
  }

  /**
   * Checks the valid clip condition.
   * @param {Readonly<object>} state State used while is valid clip.
   * @param {Readonly<object>} clip Animation clip used for the requested state.
   */
  #isValidClip(state, clip) {
    if (state.length === 0 || !clip || typeof clip !== "object") return false;
    const hasValidFrames =
      Number.isInteger(clip.startFrame) &&
      clip.startFrame >= 0 &&
      Number.isInteger(clip.frameCount) &&
      clip.frameCount > 0;
    return hasValidFrames && this.#hasValidTiming(clip);
  }

  /**
   * Checks the valid timing condition.
   * @param {Readonly<object>} clip Animation clip used for the requested state.
   */
  #hasValidTiming(clip) {
    return (
      Number.isFinite(clip.frameDurationSeconds) &&
      clip.frameDurationSeconds > 0 &&
      typeof clip.loop === "boolean"
    );
  }

  /**
   * Checks the valid delta time condition.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
