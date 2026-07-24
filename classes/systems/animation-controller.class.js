const FRAME_TIME_EPSILON_SECONDS = 1e-9;

/**
 * Wählt Spriteframes anhand eines Zustands und vergangener Spielzeit aus.
 */
export class AnimationController {
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
   * Beginnt einen Clip nur dann neu, wenn sich der Zustand ändert.
   * @param {string} state
   * @returns {number} Der erste oder aktuelle Frame des Clips.
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
   * Verarbeitet vergangene Spielzeit und liefert den sichtbaren Spriteframe.
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
   * Liefert den absoluten Frameindex des aktuellen Clips.
   * @returns {number}
   */
  getCurrentFrameIndex() {
    const clip = this.#getClip(this.state);
    return clip.startFrame + this.frameOffset;
  }

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

  #getCompletedFrameSteps(clip) {
    return Math.floor(
      (this.elapsedSeconds + FRAME_TIME_EPSILON_SECONDS) / clip.frameDurationSeconds,
    );
  }

  #applyFrameSteps(frameSteps, clip) {
    const nextOffset = this.frameOffset + frameSteps;
    this.frameOffset = clip.loop
      ? nextOffset % clip.frameCount
      : Math.min(nextOffset, clip.frameCount - 1);
  }

  #hasFinished(clip) {
    return !clip.loop && this.frameOffset === clip.frameCount - 1;
  }

  #getClip(state) {
    const clip = this.clips[state];
    if (!clip) throw new RangeError(`Unbekannter Animationszustand: ${state}`);
    return clip;
  }

  #areValidClips(clips) {
    if (!clips || typeof clips !== "object") return false;
    const entries = Object.entries(clips);
    return entries.length > 0 && entries.every(([state, clip]) => {
      return this.#isValidClip(state, clip);
    });
  }

  #isValidClip(state, clip) {
    if (state.length === 0 || !clip || typeof clip !== "object") return false;
    const hasValidFrames =
      Number.isInteger(clip.startFrame) &&
      clip.startFrame >= 0 &&
      Number.isInteger(clip.frameCount) &&
      clip.frameCount > 0;
    return hasValidFrames && this.#hasValidTiming(clip);
  }

  #hasValidTiming(clip) {
    return (
      Number.isFinite(clip.frameDurationSeconds) &&
      clip.frameDurationSeconds > 0 &&
      typeof clip.loop === "boolean"
    );
  }

  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
