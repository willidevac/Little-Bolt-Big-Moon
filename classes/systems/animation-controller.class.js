const FRAME_TIME_EPSILON_SECONDS = 1e-9;

/**
 * Selects sprite frames based on a state and elapsed game time.
 */
export class AnimationController {
  /**
   * @param {Readonly<Record<string, Readonly<object>>>} clips
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
   * @param {string} state
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
   * @param {string} state
   * @param {number} deltaTimeSeconds
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

  /** Updates advance. */
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

  /** Returns completed frame steps. */
  #getCompletedFrameSteps(clip) {
    return Math.floor(
      (this.elapsedSeconds + FRAME_TIME_EPSILON_SECONDS) / clip.frameDurationSeconds,
    );
  }

  /** Applies frame steps. */
  #applyFrameSteps(frameSteps, clip) {
    const nextOffset = this.frameOffset + frameSteps;
    this.frameOffset = clip.loop
      ? nextOffset % clip.frameCount
      : Math.min(nextOffset, clip.frameCount - 1);
  }

  /** Checks the finished condition. */
  #hasFinished(clip) {
    return !clip.loop && this.frameOffset === clip.frameCount - 1;
  }

  /** Returns clip. */
  #getClip(state) {
    const clip = this.clips[state];
    if (!clip) throw new RangeError(`Unbekannter Animationszustand: ${state}`);
    return clip;
  }

  /** Performs the are valid clips operation. */
  #areValidClips(clips) {
    if (!clips || typeof clips !== "object") return false;
    const entries = Object.entries(clips);
    return entries.length > 0 && entries.every(([state, clip]) => {
      return this.#isValidClip(state, clip);
    });
  }

  /** Checks the valid clip condition. */
  #isValidClip(state, clip) {
    if (state.length === 0 || !clip || typeof clip !== "object") return false;
    const hasValidFrames =
      Number.isInteger(clip.startFrame) &&
      clip.startFrame >= 0 &&
      Number.isInteger(clip.frameCount) &&
      clip.frameCount > 0;
    return hasValidFrames && this.#hasValidTiming(clip);
  }

  /** Checks the valid timing condition. */
  #hasValidTiming(clip) {
    return (
      Number.isFinite(clip.frameDurationSeconds) &&
      clip.frameDurationSeconds > 0 &&
      typeof clip.loop === "boolean"
    );
  }

  /** Checks the valid delta time condition. */
  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
