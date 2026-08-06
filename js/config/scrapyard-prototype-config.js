export const SCRAPYARD_PROTOTYPE_BOUNDS = Object.freeze({
  topY: 146850,
  bottomY: 149904,
});

export const SCRAPYARD_PLATFORM_ROLES = Object.freeze({
  precision: role("precision", 192, 103, "#53f4f2"),
  standard: role("standard", 384, 93, "#35e8ef"),
  launch: role("launch", 512, 87, "#ff9b38"),
  rest: role("rest", 640, 175, "#72fff2"),
  rescue: role("rescue", 320, 88, "#ffc247"),
});

export const SCRAPYARD_PROTOTYPE_PLATFORMS = Object.freeze([
  platform("scrap-test-01", "standard", 120, 149680, 300, 82, 1),
  platform("scrap-test-02", "standard", 440, 149450, 260, 82, 2),
  platform("scrap-test-03", "standard", 850, 149205, 220, 82, 3),
  platform("scrap-test-04", "standard", 640, 148920, 240, 82, 4),
  platform("scrap-test-05", "precision", 220, 148665, 180, 78, 5),
  platform("scrap-test-06", "standard", 500, 148390, 250, 82, 6),
  platform("scrap-test-07", "launch", 900, 148120, 280, 92, 7, "left"),
  platform("scrap-test-08", "standard", 650, 147820, 210, 82, 8),
  platform("scrap-test-09", "precision", 180, 147550, 180, 78, 9),
  platform("scrap-test-10", "standard", 500, 147260, 240, 82, 10),
  platform("scrap-test-11", "rest", 240, 146940, 400, 104, 11),
  optional("scrap-test-rescue-01", "rescue", 390, 147720, 210, 88,
    "fall-catch"),
]);

export const SCRAPYARD_PROTOTYPE_WALLS = Object.freeze([]);

/**
 * Creates an immutable visual role for a scrapyard platform.
 * @param {string} id Stable platform-role identifier.
 * @param {number} frameWidth Native sprite-frame width in pixels.
 * @param {number} frameHeight Native sprite-frame height in pixels.
 * @param {string} accentColor CSS color used to accent the platform.
 */
function role(id, frameWidth, frameHeight, accentColor) {
  return Object.freeze({ id, frameWidth, frameHeight, accentColor });
}

/**
 * Creates one mandatory platform on the prototype route.
 * @param {string} id Stable platform identifier.
 * @param {string} platformRole Visual and gameplay role of the platform.
 * @param {number} x Horizontal world position in pixels.
 * @param {number} y Vertical world position in pixels.
 * @param {number} width Collision width in pixels.
 * @param {number} height Collision height in pixels.
 * @param {number} routeOrder Position on the mandatory route.
 * @param {string|null} [suggestedDirection=null] Suggested next movement direction.
 */
function platform(id, platformRole, x, y, width, height, routeOrder,
  suggestedDirection = null) {
  return Object.freeze({
    id, platformRole, x, y, width, height, routeOrder,
    suggestedDirection, routeRole: "main", isOptional: false,
  });
}

/**
 * Creates one optional support platform beside the main route.
 * @param {string} id Stable platform identifier.
 * @param {string} platformRole Visual and gameplay role of the platform.
 * @param {number} x Horizontal world position in pixels.
 * @param {number} y Vertical world position in pixels.
 * @param {number} width Collision width in pixels.
 * @param {number} height Collision height in pixels.
 * @param {string} routeRole Purpose of the optional route segment.
 */
function optional(id, platformRole, x, y, width, height, routeRole) {
  return Object.freeze({
    id, platformRole, x, y, width, height, routeOrder: null,
    suggestedDirection: null, routeRole, isOptional: true,
  });
}
