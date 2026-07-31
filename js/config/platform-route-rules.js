export const FLOOR_OFFSET_Y = 160;
export const SECTION_EDGE_OFFSET_Y = 64;
export const MINIMUM_PLATFORM_GAP_Y = 80;
export const MINIMUM_EDGE_GAP_Y = 64;
export const MAXIMUM_PLATFORM_GAP_Y = 128;
export const MAXIMUM_AUTHORED_GAP_Y = 180;
export const MAXIMUM_HORIZONTAL_GAP = 128;
export const MAXIMUM_AUTHORED_HORIZONTAL_GAP = 192;
export const SIDE_PADDING = 64;
export const PLATFORM_WIDTHS = Object.freeze({
  floor: 1152,
  path: 192,
  narrow: 128,
  moving: 192,
  falling: 192,
  catch: 512,
});

export const BIOME_CHALLENGE_PROFILES = Object.freeze({
  scrapyard: Object.freeze(["narrow"]),
  factory: Object.freeze(["falling"]),
  "launch-tower": Object.freeze(["moving"]),
  "space-station": Object.freeze(["moving", "falling"]),
  moon: Object.freeze(["narrow", "moving", "falling"]),
});
