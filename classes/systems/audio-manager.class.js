const createBrowserAudio = (source) => new Audio(source);
const getCurrentTime = () => globalThis.performance?.now() ?? Date.now();

/**
 * Loads music and fixed effect pools and limits their playback.
 */
export class AudioManager {
  #effectPools = new Map();
  #musicTracks = new Map();
  #lastEffectTimes = new Map();

  /**
   * @param {Readonly<object>} config
   * @param {(source:string) => HTMLAudioElement} [createAudio]
   * @param {() => number} [now]
   */
  constructor(config, createAudio = createBrowserAudio, now = getCurrentTime) {
    this.#validateConfig(config);
    this.config = config;
    this.createAudio = createAudio;
    this.now = now;
    this.isInitialized = false;
    this.isUnlocked = false;
    this.isMuted = false;
    this.musicVolume = 1;
    this.effectsVolume = 1;
    this.currentMusicId = null;
  }

  /**
   * Creates every track and allowed effect voice exactly once.
   * @returns {AudioManager}
   */
  initialize() {
    if (this.isInitialized) return this;
    Object.entries(this.config.music).forEach(([id, definition]) => {
      this.#musicTracks.set(id, this.#createTrack(definition, true));
    });
    Object.entries(this.config.effects).forEach(([id, definition]) => {
      this.#effectPools.set(id, this.#createEffectPool(definition));
    });
    this.isInitialized = true;
    return this;
  }

  /**
   * Allows playback only after a genuine user interaction.
   */
  unlock() {
    if (this.isUnlocked) return;
    this.isUnlocked = true;
    if (this.currentMusicId && !this.isMuted) this.resumeMusic();
  }

  /**
   * Plays an effect only within its fixed pool and timing interval.
   * @param {string} id
   * @returns {boolean}
   */
  playEffect(id) {
    const pool = this.#getEffectPool(id);
    if (!this.isUnlocked || this.isMuted || !this.#canPlayEffect(id, pool)) return false;
    const voice = pool.voices.find((audio) => audio.paused || audio.ended);
    if (!voice) return false;
    this.#rewind(voice);
    this.#lastEffectTimes.set(id, this.now());
    return this.#play(voice);
  }

  /**
   * Selects a music track and starts it once audio is unlocked.
   * @param {string} id
   */
  playMusic(id) {
    this.#getMusicTrack(id);
    if (this.currentMusicId !== id) {
      this.stopMusic();
      this.currentMusicId = id;
    }
    if (this.isUnlocked && !this.isMuted) this.resumeMusic();
  }

  /** Pauses only the current music track. */
  pauseMusic() {
    this.#getCurrentMusic()?.pause();
  }

  /** Resumes the selected music without losing its position. */
  resumeMusic() {
    const track = this.#getCurrentMusic();
    if (track && this.isUnlocked && !this.isMuted) this.#play(track);
  }

  /** Stops and forgets the current music track. */
  stopMusic() {
    const track = this.#getCurrentMusic();
    if (track) {
      track.pause();
      this.#rewind(track);
    }
    this.currentMusicId = null;
  }

  /**
   * Mutes all prepared voices together.
   * @param {boolean} isMuted
   */
  setMuted(isMuted) {
    this.isMuted = Boolean(isMuted);
    this.#getAllAudio().forEach((audio) => { audio.muted = this.isMuted; });
    if (!this.isMuted) return;
    this.pauseMusic();
    this.#stopEffects();
  }

  /**
   * Changes the music volume to a value between zero and one.
   * @param {number} volume
   */
  setMusicVolume(volume) {
    this.musicVolume = this.#toVolume(volume);
    this.#musicTracks.forEach((audio, id) => {
      audio.volume = this.config.music[id].volume * this.musicVolume;
    });
  }

  /**
   * Changes all effect volumes to a value between zero and one.
   * @param {number} volume
   */
  setEffectsVolume(volume) {
    this.effectsVolume = this.#toVolume(volume);
    this.#effectPools.forEach((pool) => {
      pool.voices.forEach((audio) => {
        audio.volume = pool.definition.volume * this.effectsVolume;
      });
    });
  }

  /** Stops all active voices and clears the music state. */
  destroy() {
    this.#getAllAudio().forEach((audio) => {
      audio.pause();
      this.#rewind(audio);
    });
    this.currentMusicId = null;
  }

  #createEffectPool(definition) {
    const voices = Array.from(
      { length: definition.maximumVoices },
      () => this.#createTrack(definition, false),
    );
    return Object.freeze({ definition, voices: Object.freeze(voices) });
  }

  #toVolume(value) {
    if (!Number.isFinite(value)) {
      throw new TypeError("Die Lautstärke muss eine Zahl sein.");
    }
    return Math.min(1, Math.max(0, value));
  }

  #createTrack(definition, loops) {
    const audio = this.createAudio(definition.source);
    audio.preload = "auto";
    audio.loop = loops;
    const volumeSetting = loops ? this.musicVolume : this.effectsVolume;
    audio.volume = definition.volume * volumeSetting;
    audio.muted = this.isMuted;
    audio.load?.();
    return audio;
  }

  #canPlayEffect(id, pool) {
    const previous = this.#lastEffectTimes.get(id) ?? Number.NEGATIVE_INFINITY;
    return this.now() - previous >= pool.definition.minimumIntervalMilliseconds;
  }

  #play(audio) {
    try {
      const result = audio.play();
      result?.catch?.(() => {});
      return true;
    } catch {
      return false;
    }
  }

  #rewind(audio) {
    try {
      audio.currentTime = 0;
    } catch {
      // A track that has not loaded yet starts at zero on its first playback anyway.
    }
  }

  #getEffectPool(id) {
    const pool = this.#effectPools.get(id);
    if (pool) return pool;
    throw new RangeError(`Unbekannter Audioeffekt: ${id}`);
  }

  #getMusicTrack(id) {
    const track = this.#musicTracks.get(id);
    if (track) return track;
    throw new RangeError(`Unbekannte Spielmusik: ${id}`);
  }

  #getCurrentMusic() {
    return this.currentMusicId
      ? this.#musicTracks.get(this.currentMusicId)
      : null;
  }

  #getAllAudio() {
    const effects = [...this.#effectPools.values()].flatMap((pool) => pool.voices);
    return [...this.#musicTracks.values(), ...effects];
  }

  #stopEffects() {
    this.#effectPools.forEach((pool) => {
      pool.voices.forEach((audio) => {
        audio.pause();
        this.#rewind(audio);
      });
    });
  }

  #validateConfig(config) {
    const groups = [config?.music, config?.effects];
    const definitions = groups.flatMap((group) => Object.values(group ?? {}));
    const valid = groups.every((group) => group && typeof group === "object") &&
      definitions.length > 0 &&
      definitions.every((definition) => this.#isValidDefinition(definition));
    if (valid) return;
    throw new TypeError("Die Audiokonfiguration ist unvollständig.");
  }

  #isValidDefinition(definition) {
    const hasSource = typeof definition?.source === "string" && definition.source;
    const hasVolume = Number.isFinite(definition?.volume) &&
      definition.volume >= 0 && definition.volume <= 1;
    const voices = definition?.maximumVoices ?? 1;
    const interval = definition?.minimumIntervalMilliseconds ?? 0;
    return hasSource && hasVolume && Number.isInteger(voices) && voices > 0 &&
      Number.isFinite(interval) && interval >= 0;
  }
}
