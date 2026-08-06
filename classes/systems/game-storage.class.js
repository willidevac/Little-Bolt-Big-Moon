import { LOCALIZATION_CONFIG } from "../../js/config/localization-config.js";

const DEFAULT_RECORDS = Object.freeze({
  version: 1,
  bestScore: 0,
  maximumHeight: 0,
  bestTimeSeconds: null,
  isMuted: false,
  musicVolume: 75,
  effectsVolume: 85,
  language: LOCALIZATION_CONFIG.defaultLanguage,
});

/**
 * Stores records and settings in the browser with safe error handling.
 */
export class GameStorage {
  /**
   * @param {Storage|null} storage
   * @param {Readonly<{key:string, version:number}>} config
   */
  constructor(storage, config) {
    this.#validateConfig(config);
    this.storage = storage;
    this.key = config.key;
    this.version = config.version;
    this.data = this.#createDefaults();
    this.load();
  }

  /**
   * Loads the saved data or uses safe default values.
   * @returns {Readonly<object>}
   */
  load() {
    try {
      const savedData = JSON.parse(this.storage?.getItem(this.key) ?? "null");
      this.data = this.#sanitize(savedData);
    } catch {
      this.data = this.#createDefaults();
    }
    this.#persist();
    return this.getSnapshot();
  }

  /**
   * Applies the best values from a completed run.
   * @param {Readonly<object>} run
   * @param {boolean} isVictory
   * @returns {Readonly<object>}
   */
  recordRun(run, isVictory) {
    const score = this.#toInteger(run?.score);
    const height = this.#toInteger(run?.heightMeters);
    const victoryTime = isVictory
      ? this.#toOptionalTime(run?.elapsedSeconds)
      : null;
    this.data = this.#createRunRecord(score, height, victoryTime);
    this.#persist();
    return this.getSnapshot();
  }

  /** Creates run record. */
  #createRunRecord(score, height, victoryTime) {
    return {
      ...this.data,
      bestScore: Math.max(this.data.bestScore, score),
      maximumHeight: Math.max(this.data.maximumHeight, height),
      bestTimeSeconds: this.#getBestTime(victoryTime),
    };
  }

  /**
   * Stores whether audio should be muted.
   * @param {boolean} isMuted
   * @returns {Readonly<object>}
   */
  setMuted(isMuted) {
    this.data = { ...this.data, isMuted: Boolean(isMuted) };
    this.#persist();
    return this.getSnapshot();
  }

  /**
   * Stores a volume between 0 and 100 percent.
   * @param {"music"|"effects"} group
   * @param {number} value
   * @returns {Readonly<object>}
   */
  setVolume(group, value) {
    const property = this.#getVolumeProperty(group);
    this.data = { ...this.data, [property]: this.#toPercentage(value) };
    this.#persist();
    return this.getSnapshot();
  }

  /**
   * Stores a supported interface language.
   * @param {string} language
   * @returns {Readonly<object>}
   */
  setLanguage(language) {
    const selected = LOCALIZATION_CONFIG.languages.includes(language)
      ? language
      : LOCALIZATION_CONFIG.defaultLanguage;
    this.data = { ...this.data, language: selected };
    this.#persist();
    return this.getSnapshot();
  }

  /**
   * Returns an immutable copy of the current data.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({ ...this.data });
  }

  /** Performs the persist operation. */
  #persist() {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.data));
    } catch {
      // Der sichere Arbeitsspeicher bleibt nutzbar, auch wenn Schreiben verboten ist.
    }
  }

  /** Performs the sanitize operation. */
  #sanitize(savedData) {
    const source = savedData && typeof savedData === "object" ? savedData : {};
    return {
      version: this.version,
      bestScore: this.#toInteger(source.bestScore),
      maximumHeight: this.#toInteger(source.maximumHeight),
      bestTimeSeconds: this.#toOptionalTime(source.bestTimeSeconds),
      isMuted: typeof source.isMuted === "boolean" ? source.isMuted : false,
      language: this.#sanitizeLanguage(source.language),
      ...this.#sanitizeVolumes(source),
    };
  }

  /** Performs the sanitize volumes operation. */
  #sanitizeVolumes(source) {
    return {
      musicVolume: this.#toPercentage(
        source.musicVolume, DEFAULT_RECORDS.musicVolume,
      ),
      effectsVolume: this.#toPercentage(
        source.effectsVolume, DEFAULT_RECORDS.effectsVolume,
      ),
    };
  }

  /** Creates defaults. */
  #createDefaults() {
    return { ...DEFAULT_RECORDS, version: this.version };
  }

  /** Returns best time. */
  #getBestTime(victoryTime) {
    if (victoryTime === null) return this.data.bestTimeSeconds;
    if (this.data.bestTimeSeconds === null) return victoryTime;
    return Math.min(this.data.bestTimeSeconds, victoryTime);
  }

  /** Performs the to integer operation. */
  #toInteger(value) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }

  /** Performs the to optional time operation. */
  #toOptionalTime(value) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
  }

  /** Performs the to percentage operation. */
  #toPercentage(value, fallback = 0) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  /** Returns volume property. */
  #getVolumeProperty(group) {
    if (group === "music") return "musicVolume";
    if (group === "effects") return "effectsVolume";
    throw new RangeError(`Unbekannte Lautstärkegruppe: ${group}`);
  }

  /** Performs the sanitize language operation. */
  #sanitizeLanguage(language) {
    return LOCALIZATION_CONFIG.languages.includes(language)
      ? language
      : LOCALIZATION_CONFIG.defaultLanguage;
  }

  /** Validates config. */
  #validateConfig(config) {
    const hasKey = typeof config?.key === "string" && config.key.length > 0;
    const hasVersion = Number.isInteger(config?.version) && config.version > 0;
    if (hasKey && hasVersion) return;
    throw new TypeError("Die Speicherkonfiguration ist ungültig.");
  }
}
