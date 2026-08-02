/** Loads one shared architecture image and draws cropped modules from it. */
export class StructureSpriteAtlas {
  /** @param {Readonly<{source:string,width:number,height:number}>} config */
  constructor(config) {
    this.#validateConfig(config);
    this.config = config;
    this.image = null;
    this.state = "unavailable";
    this.#load();
  }

  /** Draws one atlas region into a world-space destination rectangle. */
  draw(context, frame, destination) {
    if (this.state !== "ready") return false;
    this.#validateFrame(frame);
    const source = [frame.x, frame.y, frame.width, frame.height];
    const target = [
      destination.x, destination.y, destination.width, destination.height,
    ];
    context.drawImage(this.image, ...source, ...target);
    return true;
  }

  #load() {
    const ImageConstructor = globalThis.Image;
    if (typeof ImageConstructor !== "function") return;
    this.image = new ImageConstructor();
    this.state = "loading";
    this.image.onload = () => this.#handleLoad();
    this.image.onerror = () => { this.state = "error"; };
    this.image.src = this.config.source;
  }

  #handleLoad() {
    const hasExpectedSize = this.image.naturalWidth >= this.config.width &&
      this.image.naturalHeight >= this.config.height;
    this.state = hasExpectedSize ? "ready" : "error";
  }

  #validateConfig(config) {
    const sizes = [config?.width, config?.height];
    const hasSizes = sizes.every((value) => Number.isInteger(value) && value > 0);
    if (typeof config?.source === "string" && config.source && hasSizes) return;
    throw new TypeError("The architecture-atlas configuration is invalid.");
  }

  #validateFrame(frame) {
    const values = [frame?.x, frame?.y, frame?.width, frame?.height];
    const hasValues = values.every((value) => Number.isFinite(value));
    const fitsAtlas = frame?.x >= 0 && frame?.y >= 0 &&
      frame.x + frame.width <= this.config.width &&
      frame.y + frame.height <= this.config.height;
    if (hasValues && frame.width > 0 && frame.height > 0 && fitsAtlas) return;
    throw new RangeError("The architecture frame is outside its atlas.");
  }
}
