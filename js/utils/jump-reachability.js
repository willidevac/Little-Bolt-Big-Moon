const DEFAULT_FRAMES_PER_SECOND = 60;
const DEFAULT_SAFE_OVERLAP = 16;
const CHARACTER_LANDING_WIDTH = 32;

/** @typedef {{x:number, y:number, width:number}} JumpSurface */
/** @typedef {{gravityPixelsPerSecondSquared:number}} JumpPhysics */
/**
 * @typedef {{
 *   jumpChargeSeconds:number,
 *   minimumJumpSpeedPixelsPerSecond:number,
 *   maximumJumpSpeedPixelsPerSecond:number,
 *   minimumJumpHorizontalSpeedPixelsPerSecond:number,
 *   maximumJumpHorizontalSpeedPixelsPerSecond:number
 * }} JumpCharacterConfig
 */
/** @typedef {{framesPerSecond?:number, safeOverlapPixels?:number}} JumpOptions */
/** @typedef {{frame:number, ratio:number, direction:number, seconds:number, distance:number}} JumpSample */

/**
 * Evaluates the exact discrete charge frames that can land a regular jump.
 * The result uses the same velocity interpolation and gravity as gameplay.
 * @param {JumpSurface} lower
 * @param {JumpSurface} upper
 * @param {JumpPhysics} physics
 * @param {JumpCharacterConfig} character
 * @param {JumpOptions} [options]
 */
export function evaluateJumpWindow(lower, upper, physics, character,
  options = {}) {
  validateJumpInputs(lower, upper, physics, character);
  const framesPerSecond = options.framesPerSecond ?? DEFAULT_FRAMES_PER_SECOND;
  const safeOverlapPixels = options.safeOverlapPixels ?? DEFAULT_SAFE_OVERLAP;
  const fullChargeFrame = Math.ceil(character.jumpChargeSeconds * framesPerSecond);
  const samples = collectJumpSamples(
    lower, upper, physics, character,
    framesPerSecond, safeOverlapPixels, fullChargeFrame,
  );
  return createJumpWindowResult(samples, fullChargeFrame);
}

/**
 * Collects every valid charge and direction sample.
 * @param {JumpSurface} lower @param {JumpSurface} upper
 * @param {JumpPhysics} physics @param {JumpCharacterConfig} character
 * @param {number} framesPerSecond @param {number} safeOverlapPixels
 * @param {number} fullChargeFrame @returns {ReadonlyArray<Readonly<JumpSample>>}
 */
function collectJumpSamples(lower, upper, physics, character, framesPerSecond,
  safeOverlapPixels, fullChargeFrame) {
  const samples = [];
  for (let frame = 0; frame <= fullChargeFrame; frame += 1) {
    samples.push(...createFrameSamples(
      lower, upper, physics, character, framesPerSecond, safeOverlapPixels, frame,
    ));
  }
  return samples;
}

/**
 * Creates all valid directional samples for one charge frame.
 * @param {JumpSurface} lower @param {JumpSurface} upper
 * @param {JumpPhysics} physics @param {JumpCharacterConfig} character
 * @param {number} framesPerSecond @param {number} safeOverlapPixels
 * @param {number} frame @returns {ReadonlyArray<Readonly<JumpSample>>}
 */
function createFrameSamples(lower, upper, physics, character, framesPerSecond,
  safeOverlapPixels, frame) {
  const ratio = Math.min(1, frame / framesPerSecond / character.jumpChargeSeconds);
  const seconds = getDescendingFlightSeconds(
    lower.y - upper.y, ratio, physics, character,
  );
  if (seconds === null) return [];
  const speed = interpolate(character.minimumJumpHorizontalSpeedPixelsPerSecond,
    character.maximumJumpHorizontalSpeedPixelsPerSecond, ratio);
  return createDirectionalSamples(
    lower, upper, safeOverlapPixels, frame, ratio, seconds, speed,
  );
}

/**
 * Creates valid landing samples for left, neutral, and right movement.
 * @param {JumpSurface} lower @param {JumpSurface} upper
 * @param {number} overlap @param {number} frame @param {number} ratio
 * @param {number} seconds @param {number} speed
 * @returns {ReadonlyArray<Readonly<JumpSample>>}
 */
function createDirectionalSamples(lower, upper, overlap, frame, ratio,
  seconds, speed) {
  return [-1, 0, 1].flatMap((direction) => {
    const sample = createSample(
      lower, upper, overlap, frame, ratio, direction, seconds, speed,
    );
    return sample ? [sample] : [];
  });
}

/**
 * Creates one valid landing sample or returns null.
 * @param {JumpSurface} lower @param {JumpSurface} upper
 * @param {number} overlap @param {number} frame @param {number} ratio
 * @param {number} direction @param {number} seconds @param {number} speed
 * @returns {Readonly<JumpSample>|null}
 */
function createSample(lower, upper, overlap, frame, ratio, direction,
  seconds, speed) {
  const distance = direction * speed * seconds;
  if (!canLandAtDistance(lower, upper, distance, overlap)) return null;
  return Object.freeze({ frame, ratio, direction, seconds, distance });
}

/**
 * Creates the immutable aggregate for one jump window.
 * @param {ReadonlyArray<Readonly<JumpSample>>} samples
 * @param {number} fullChargeFrame
 */
function createJumpWindowResult(samples, fullChargeFrame) {
  const chargeFrames = [...new Set(samples.map(({ frame }) => frame))];
  return Object.freeze({
    samples: Object.freeze(samples),
    chargeFrames: Object.freeze(chargeFrames),
    frameCount: chargeFrames.length,
    minimumFrame: chargeFrames[0] ?? null,
    maximumWorkingFrame: chargeFrames.at(-1) ?? null,
    fullChargeWorks: chargeFrames.includes(fullChargeFrame),
    maximumFrame: fullChargeFrame,
  });
}

/**
 * Returns the descending flight duration for a charged jump or null.
 * @param {number} rise
 * @param {number} ratio
 * @param {JumpPhysics} physics
 * @param {JumpCharacterConfig} character
 * @returns {number|null}
 */
export function getDescendingFlightSeconds(rise, ratio, physics, character) {
  if (!Number.isFinite(rise) || rise < 0) return null;
  const verticalSpeed = interpolate(
    character.minimumJumpSpeedPixelsPerSecond,
    character.maximumJumpSpeedPixelsPerSecond,
    ratio,
  );
  const gravity = physics.gravityPixelsPerSecondSquared;
  const discriminant = verticalSpeed ** 2 - 2 * gravity * rise;
  if (discriminant < 0) return null;
  return (verticalSpeed + Math.sqrt(discriminant)) / gravity;
}

/**
 * @param {JumpSurface} lower
 * @param {JumpSurface} upper
 * @param {number} distance
 * @param {number} safeOverlapPixels
 */
function canLandAtDistance(lower, upper, distance, safeOverlapPixels) {
  const launchMinimum = lower.x;
  const launchMaximum = lower.x + lower.width - CHARACTER_LANDING_WIDTH;
  if (launchMaximum < launchMinimum) return false;
  const landingMinimum = upper.x + safeOverlapPixels - distance -
    CHARACTER_LANDING_WIDTH;
  const landingMaximum = upper.x + upper.width - safeOverlapPixels - distance;
  return Math.max(launchMinimum, landingMinimum) <=
    Math.min(launchMaximum, landingMaximum);
}

/** @param {number} minimum @param {number} maximum @param {number} ratio */
function interpolate(minimum, maximum, ratio) {
  return minimum + (maximum - minimum) * ratio;
}

/**
 * @param {JumpSurface} lower
 * @param {JumpSurface} upper
 * @param {JumpPhysics} physics
 * @param {JumpCharacterConfig} character
 */
function validateJumpInputs(lower, upper, physics, character) {
  const platformsAreValid = [lower, upper].every(isValidJumpSurface);
  const values = getJumpConfigValues(physics, character);
  const configIsValid = values.every((value) => {
    return Number.isFinite(value) && value > 0;
  });
  if (platformsAreValid && configIsValid) return;
  throw new TypeError("The jump-reachability input is invalid.");
}

/** @param {JumpSurface} platform @returns {boolean} */
function isValidJumpSurface(platform) {
  return [platform?.x, platform?.y, platform?.width].every(Number.isFinite) &&
    platform.width >= CHARACTER_LANDING_WIDTH;
}

/**
 * Returns numeric values that every jump configuration must provide.
 * @param {JumpPhysics} physics @param {JumpCharacterConfig} character
 * @returns {ReadonlyArray<number>}
 */
function getJumpConfigValues(physics, character) {
  return [
    physics?.gravityPixelsPerSecondSquared,
    character?.jumpChargeSeconds,
    character?.minimumJumpSpeedPixelsPerSecond,
    character?.maximumJumpSpeedPixelsPerSecond,
    character?.minimumJumpHorizontalSpeedPixelsPerSecond,
    character?.maximumJumpHorizontalSpeedPixelsPerSecond,
  ];
}
