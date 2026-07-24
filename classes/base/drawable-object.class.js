const PLACEHOLDER_COLORS = Object.freeze({
  loading: "#6f4a2f",
  error: "#7f3045",
  border: "#35d5d3",
});

/**
 * Gemeinsame Grundlage für alle im Canvas gezeichneten Objekte.
 */
export class DrawableObject {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.image = null;
    this.imageState = "empty";
    this.spriteConfig = null;
    this.frameIndex = 0;
  }

  /**
   * Startet das Laden eines konfigurierten Spritesheets.
   * @param {{source:string, frameWidth:number, frameHeight:number, frameCount:number}} config
   * @returns {boolean} Ob der Ladevorgang gestartet wurde.
   */
  loadSprite(config) {
    if (!this.#isValidSpriteConfig(config)) {
      throw new TypeError("Die Sprite-Konfiguration ist ungültig.");
    }
    this.spriteConfig = config;
    this.frameIndex = 0;
    const ImageConstructor = globalThis.Image;
    if (typeof ImageConstructor !== "function") return this.#markImageUnavailable();
    this.#startImageLoad(new ImageConstructor(), config.source);
    return true;
  }

  /**
   * Wählt einen gültigen Frame aus dem geladenen Spritesheet.
   * @param {number} frameIndex
   */
  setFrameIndex(frameIndex) {
    const frameCount = this.spriteConfig?.frameCount ?? 0;
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= frameCount) {
      throw new RangeError(`Ungültiger Spriteframe: ${frameIndex}`);
    }
    this.frameIndex = frameIndex;
  }

  /**
   * Zeichnet den aktuellen Spriteframe oder einen sicheren Platzhalter.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    if (this.width <= 0 || this.height <= 0) return;
    context.save();
    if (this.imageState === "ready") this.#drawSpriteFrame(context);
    else this.#drawPlaceholder(context);
    context.restore();
  }

  #startImageLoad(image, source) {
    this.image = image;
    this.imageState = "loading";
    image.onload = () => this.#handleImageLoad(image);
    image.onerror = () => this.#handleImageError(image);
    image.src = source;
  }

  #handleImageLoad(image) {
    if (this.image !== image) return;
    this.imageState = this.#hasExpectedFrames(image) ? "ready" : "error";
  }

  #handleImageError(image) {
    if (this.image === image) this.imageState = "error";
  }

  #markImageUnavailable() {
    this.imageState = "error";
    return false;
  }

  #drawSpriteFrame(context) {
    const sourceFrame = this.#getSourceFrame();
    const targetFrame = [this.x, this.y, this.width, this.height];
    context.drawImage(this.image, ...sourceFrame, ...targetFrame);
  }

  #getSourceFrame() {
    const { frameWidth, frameHeight } = this.spriteConfig;
    const columns = Math.floor(this.image.naturalWidth / frameWidth);
    const sourceX = (this.frameIndex % columns) * frameWidth;
    const sourceY = Math.floor(this.frameIndex / columns) * frameHeight;
    return [sourceX, sourceY, frameWidth, frameHeight];
  }

  #drawPlaceholder(context) {
    const fillColor = PLACEHOLDER_COLORS[this.imageState] ?? PLACEHOLDER_COLORS.loading;
    context.fillStyle = fillColor;
    context.fillRect(this.x, this.y, this.width, this.height);
    context.strokeStyle = PLACEHOLDER_COLORS.border;
    context.lineWidth = 2;
    context.strokeRect(this.x, this.y, this.width, this.height);
  }

  #hasExpectedFrames(image) {
    const { frameWidth, frameHeight, frameCount } = this.spriteConfig;
    const columns = Math.floor(image.naturalWidth / frameWidth);
    const rows = Math.floor(image.naturalHeight / frameHeight);
    return columns * rows >= frameCount;
  }

  #isValidSpriteConfig(config) {
    if (!config || typeof config.source !== "string" || config.source.length === 0) return false;
    const frameValues = [config.frameWidth, config.frameHeight, config.frameCount];
    return frameValues.every((value) => Number.isInteger(value) && value > 0);
  }
}
