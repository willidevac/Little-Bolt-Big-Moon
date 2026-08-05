const freezeList = (values) => Object.freeze(values.map(Object.freeze));

export const EXPLORATION_CONFIG = Object.freeze({
  searchTargets: Object.freeze([135000, 108000, 74000, 46000, 17000]),
  combatTargets: Object.freeze([
    124000, 108000, 92000, 76000, 60000, 44000, 28000, 12000,
  ]),
  searchWidths: Object.freeze([190, 160]),
  combatWidths: Object.freeze([520, 560, 620, 580, 660, 600, 680, 700]),
  sideMargin: 64,
  branchEdgeX: Object.freeze({ left: 80, right: 1040 }),
});

export const ITEM_PLACEMENT_CONFIG = Object.freeze({
  widths: Object.freeze({
    gear: 64, energy: 64, arcCharge: 48,
    boltThrower: 64, arcCannon: 96, storyBadge: 64,
  }),
  plan: Object.freeze({
    scrapyard: freezeList([
      item("gear", 0.01), item("energy", 0.22), badge("left", 0.38),
      item("gear", 0.54), weapon("boltThrower", 0.74), item("energy", 0.9),
    ]),
    factory: freezeList([
      item("gear", 0.08), item("energy", 0.18), item("arcCharge", 0.32),
      item("gear", 0.46), weapon("arcCannon", 0.62, 3),
      item("energy", 0.77), item("gear", 0.92),
    ]),
    "launch-tower": freezeList([
      item("gear", 0.1), item("arcCharge", 0.25), item("energy", 0.42),
      item("gear", 0.58), item("arcCharge", 0.75), item("energy", 0.9),
    ]),
    "space-station": freezeList([
      item("gear", 0.1), item("energy", 0.26), item("arcCharge", 0.43),
      item("gear", 0.6), item("energy", 0.76), item("arcCharge", 0.9),
    ]),
    moon: freezeList([
      item("gear", 0.08), item("energy", 0.22), item("arcCharge", 0.36),
      item("gear", 0.5), item("energy", 0.64), badge("right", 0.78),
      item("arcCharge", 0.9),
    ]),
  }),
  searchRewardTypes: Object.freeze([
    "energy", "gear", "arcCharge", "energy", "arcCharge",
  ]),
});

export const PLATFORM_MECHANIC_CONFIG = Object.freeze({
  heights: Object.freeze({
    precision: 58, standard: 64, rest: 88,
    trap: 70, falling: 74, spring: 82, crane: 72,
  }),
  trap: Object.freeze({
    safeSeconds: 1.8, warningSeconds: 1.35,
    activeSeconds: 0.8, landingGraceSeconds: 0.85, damage: 12,
  }),
  falling: Object.freeze({
    warningDelaySeconds: 1, speedPixelsPerSecond: 560,
    maximumDropPixels: 920, respawnDelaySeconds: 2.4,
  }),
  spring: Object.freeze({
    bounceSpeedPixelsPerSecond: 1360,
    bounceHorizontalSpeedPixelsPerSecond: 400,
    bounceDirection: "right",
  }),
  crane: Object.freeze({
    travelPixels: Object.freeze({ scrapyard: 68, default: 84 }),
    cycleSeconds: Object.freeze({ scrapyard: 5.8, default: 5.2 }),
    cableLengthPixels: Object.freeze({ scrapyard: 250, default: 220 }),
    animationFrameSeconds: Object.freeze({ scrapyard: 0.24, default: 0.2 }),
    surfaceRatio: Object.freeze({ scrapyard: 0.46, default: 0.5 }),
  }),
});

function item(type, position) {
  return { type, visualType: type, amount: type === "energy" ? 25 : 1, position };
}

function weapon(weaponId, position, amount = 1) {
  return { type: "weapon", visualType: weaponId, weaponId, amount, position };
}

function badge(badgePart, position) {
  return {
    type: "storyBadge", visualType: "storyBadge",
    badgePart, amount: 1, position,
  };
}
