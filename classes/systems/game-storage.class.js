const DEFAULT_RECORDS = Object.freeze({
  version: 1,
  bestScore: 0,
  maximumHeight: 0,
  bestTimeSeconds: null,
  isMuted: false,
  musicVolume: 75,
  effectsVolume: 85,
});

/**
 * Bewahrt Rekorde und Einstellungen fehlertolerant im Browser auf.
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
   * Lädt den gespeicherten Datensatz oder verwendet sichere Standardwerte.
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
   * Übernimmt die besten Werte eines beendeten Laufs.
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
    this.data = {
      ...this.data,
      bestScore: Math.max(this.data.bestScore, score),
      maximumHeight: Math.max(this.data.maximumHeight, height),
      bestTimeSeconds: this.#getBestTime(victoryTime),
    };
    this.#persist();
    return this.getSnapshot();
  }

  /**
   * Merkt sich, ob der Ton ausgeschaltet sein soll.
   * @param {boolean} isMuted
   * @returns {Readonly<object>}
   */
  setMuted(isMuted) {
    this.data = { ...this.data, isMuted: Boolean(isMuted) };
    this.#persist();
    return this.getSnapshot();
  }

  /**
   * Speichert eine Lautstärke zwischen 0 und 100 Prozent.
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
   * Gibt eine unveränderliche Kopie des aktuellen Datensatzes zurück.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({ ...this.data });
  }

  #persist() {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.data));
    } catch {
      // Der sichere Arbeitsspeicher bleibt nutzbar, auch wenn Schreiben verboten ist.
    }
  }

  #sanitize(savedData) {
    const source = savedData && typeof savedData === "object" ? savedData : {};
    return {
      version: this.version,
      bestScore: this.#toInteger(source.bestScore),
      maximumHeight: this.#toInteger(source.maximumHeight),
      bestTimeSeconds: this.#toOptionalTime(source.bestTimeSeconds),
      isMuted: typeof source.isMuted === "boolean" ? source.isMuted : false,
      musicVolume: this.#toPercentage(
        source.musicVolume,
        DEFAULT_RECORDS.musicVolume,
      ),
      effectsVolume: this.#toPercentage(
        source.effectsVolume,
        DEFAULT_RECORDS.effectsVolume,
      ),
    };
  }

  #createDefaults() {
    return { ...DEFAULT_RECORDS, version: this.version };
  }

  #getBestTime(victoryTime) {
    if (victoryTime === null) return this.data.bestTimeSeconds;
    if (this.data.bestTimeSeconds === null) return victoryTime;
    return Math.min(this.data.bestTimeSeconds, victoryTime);
  }

  #toInteger(value) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }

  #toOptionalTime(value) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
  }

  #toPercentage(value, fallback = 0) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  #getVolumeProperty(group) {
    if (group === "music") return "musicVolume";
    if (group === "effects") return "effectsVolume";
    throw new RangeError(`Unbekannte Lautstärkegruppe: ${group}`);
  }

  #validateConfig(config) {
    const hasKey = typeof config?.key === "string" && config.key.length > 0;
    const hasVersion = Number.isInteger(config?.version) && config.version > 0;
    if (hasKey && hasVersion) return;
    throw new TypeError("Die Speicherkonfiguration ist ungültig.");
  }
}
