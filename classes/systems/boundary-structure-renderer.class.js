const PANEL_SPACING_PIXELS = 180;
const EDGE_WIDTH_PIXELS = 4;
const PANEL_SIDE_INSET_PIXELS = 8;

const STRUCTURE_PALETTES = Object.freeze({
  scrapyard: createPalette("#35251f", "#1b1716", "#c86f32", "#74472f", "#efad58"),
  factory: createPalette("#282d31", "#15191c", "#d17b37", "#52606a", "#f1b65d"),
  "launch-tower": createPalette("#202b35", "#111922", "#df8438", "#49687c", "#f3c06b"),
  "space-station": createPalette("#172936", "#0c1922", "#35d8d5", "#31586c", "#8af2ec"),
  moon: createPalette("#393c45", "#20232a", "#e2cfaa", "#718798", "#7de1df"),
});

function createPalette(base, panel, edge, detail, light) {
  return Object.freeze({ base, panel, edge, detail, light });
}

/** Draws crisp biome architecture around the physical world boundaries. */
export class BoundaryStructureRenderer {
  /**
   * @param {ReadonlyArray<object>} sections
   * @param {Readonly<object>} config
   */
  constructor(sections, config) {
    this.#validateConfig(sections, config);
    this.worldWidth = config.world.width;
    this.viewportHeight = config.canvas.height;
    this.wallWidth = config.character.wallInsetPixels;
    this.sections = Object.freeze(sections.map((section) => {
      const biome = section.tileset ?? section.backgroundId;
      return Object.freeze({ ...section, palette: STRUCTURE_PALETTES[biome] });
    }));
  }

  /** Draws only wall structures overlapping the current camera view. */
  draw(context, camera) {
    const viewTop = camera.y;
    const viewBottom = camera.y + this.viewportHeight;
    this.sections.forEach((section) => {
      const top = Math.max(section.topY, viewTop);
      const bottom = Math.min(section.bottomY, viewBottom);
      if (bottom > top) this.#drawSection(context, section.palette, top, bottom);
    });
  }

  #drawSection(context, palette, top, bottom) {
    context.save();
    context.beginPath();
    context.rect(0, top, this.worldWidth, bottom - top);
    context.clip();
    this.#drawWallBodies(context, palette, top, bottom);
    this.#drawPanels(context, palette, top, bottom);
    this.#drawInnerEdges(context, palette, top, bottom);
    context.restore();
  }

  #drawWallBodies(context, palette, top, bottom) {
    const rightX = this.worldWidth - this.wallWidth;
    context.fillStyle = palette.base;
    context.fillRect(0, top, this.wallWidth, bottom - top);
    context.fillRect(rightX, top, this.wallWidth, bottom - top);
  }

  #drawInnerEdges(context, palette, top, bottom) {
    const rightX = this.worldWidth - this.wallWidth;
    context.fillStyle = palette.edge;
    context.fillRect(this.wallWidth - EDGE_WIDTH_PIXELS, top,
      EDGE_WIDTH_PIXELS, bottom - top);
    context.fillRect(rightX, top, EDGE_WIDTH_PIXELS, bottom - top);
  }

  #drawPanels(context, palette, top, bottom) {
    const firstIndex = Math.floor(top / PANEL_SPACING_PIXELS);
    const lastIndex = Math.floor(bottom / PANEL_SPACING_PIXELS);
    for (let index = firstIndex; index <= lastIndex; index += 1) {
      this.#drawPanelPair(context, palette, index);
    }
  }

  #drawPanelPair(context, palette, index) {
    const panelY = index * PANEL_SPACING_PIXELS + 24 + index % 2 * 8;
    const panelHeight = 52 + index % 3 * 10;
    const rightX = this.worldWidth - this.wallWidth + PANEL_SIDE_INSET_PIXELS;
    this.#drawPanel(context, palette, PANEL_SIDE_INSET_PIXELS,
      panelY, panelHeight, index);
    this.#drawPanel(context, palette, rightX, panelY, panelHeight, index + 1);
  }

  #drawPanel(context, palette, x, y, height, index) {
    const width = this.wallWidth - PANEL_SIDE_INSET_PIXELS * 2;
    context.fillStyle = palette.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = palette.detail;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, width - 2, height - 2);
    if (index % 2 === 0) this.#drawPanelLight(context, palette, x, y, width);
  }

  #drawPanelLight(context, palette, x, y, width) {
    context.fillStyle = palette.light;
    context.fillRect(x + 6, y + 9, width - 12, 5);
  }

  #validateConfig(sections, config) {
    const hasSections = Array.isArray(sections) && sections.length > 0 &&
      sections.every((section) => this.#hasValidSection(section));
    const values = [config?.world?.width, config?.canvas?.height,
      config?.character?.wallInsetPixels];
    const hasSizes = values.every((value) => Number.isFinite(value) && value > 0);
    if (hasSections && hasSizes) return;
    throw new TypeError("The boundary-structure configuration is invalid.");
  }

  #hasValidSection(section) {
    const biome = section?.tileset ?? section?.backgroundId;
    return Number.isFinite(section?.topY) && Number.isFinite(section?.bottomY) &&
      section.bottomY > section.topY && Boolean(STRUCTURE_PALETTES[biome]);
  }
}
