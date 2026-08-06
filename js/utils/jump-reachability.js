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
 * @param {JumpSurface} lower Platform from which the jump begins.
 * @param {JumpSurface} upper Platform on which the character should land.
 * @param {JumpPhysics} physics Gravity used by the gameplay simulation.
 * @param {JumpCharacterConfig} character Character jump-speed configuration.
 * @param {JumpOptions} [options] Sampling rate and safe landing overlap.
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
 * @param {JumpSurface} lower Platform from which the jump begins.
 * @param {JumpSurface} upper Platform on which the character should land.
 * @param {JumpPhysics} physics Gravity used by the gameplay simulation.
 * @param {JumpCharacterConfig} character Character jump-speed configuration.
 * @param {number} framesPerSecond Charge samples evaluated per second.
 * @param {number} safeOverlapPixels Required landing overlap in pixels.
 * @param {number} fullChargeFrame Frame representing a fully charged jump.
 * @returns {ReadonlyArray<Readonly<JumpSample>>}
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
 * @param {JumpSurface} lower Platform from which the jump begins.
 * @param {JumpSurface} upper Platform on which the character should land.
 * @param {JumpPhysics} physics Gravity used by the gameplay simulation.
 * @param {JumpCharacterConfig} character Character jump-speed configuration.
 * @param {number} framesPerSecond Charge samples evaluated per second.
 * @param {number} safeOverlapPixels Required landing overlap in pixels.
 * @param {number} frame Charge frame currently being evaluated.
 * @returns {ReadonlyArray<Readonly<JumpSample>>}
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
 * @param {JumpSurface} lower Platform from which the jump begins.
 * @param {JumpSurface} upper Platform on which the character should land.
 * @param {number} overlap Required landing overlap in pixels.
 * @param {number} frame Charge frame represented by the samples.
 * @param {number} ratio Normalized jump-charge ratio.
 * @param {number} seconds Descending flight duration in seconds.
 * @param {number} speed Horizontal movement speed in pixels per second.
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
 * @param {JumpSurface} lower Platform from which the jump begins.
 * @param {JumpSurface} upper Platform on which the character should land.
 * @param {number} overlap Required landing overlap in pixels.
 * @param {number} frame Charge frame represented by the sample.
 * @param {number} ratio Normalized jump-charge ratio.
 * @param {number} direction Horizontal direction from minus one to one.
 * @param {number} seconds Descending flight duration in seconds.
 * @param {number} speed Horizontal movement speed in pixels per second.
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
 * @param {ReadonlyArray<Readonly<JumpSample>>} samples Valid landing samples.
 * @param {number} fullChargeFrame Frame representing a fully charged jump.
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
 * @param {number} rise Vertical distance to the target surface in pixels.
 * @param {number} ratio Normalized jump-charge ratio.
 * @param {JumpPhysics} physics Gravity used by the gameplay simulation.
 * @param {JumpCharacterConfig} character Character jump-speed configuration.
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
 * Checks whether a horizontal jump displacement leaves a safe landing range.
 * @param {JumpSurface} lower Platform from which the jump begins.
 * @param {JumpSurface} upper Platform on which the character should land.
 * @param {number} distance Signed horizontal jump distance in pixels.
 * @param {number} safeOverlapPixels Required landing overlap in pixels.
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

/**
 * Interpolates between two values using a normalized ratio.
 * @param {number} minimum Value returned at a zero ratio.
 * @param {number} maximum Value returned at a one ratio.
 * @param {number} ratio Normalized interpolation ratio.
 */
function interpolate(minimum, maximum, ratio) {
  return minimum + (maximum - minimum) * ratio;
}

/**
 * Validates the surfaces and configuration required by the simulation.
 * @param {JumpSurface} lower Platform from which the jump begins.
 * @param {JumpSurface} upper Platform on which the character should land.
 * @param {JumpPhysics} physics Gravity used by the gameplay simulation.
 * @param {JumpCharacterConfig} character Character jump-speed configuration.
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

/**
 * Checks whether a platform provides finite geometry and landing width.
 * @param {JumpSurface} platform Candidate jump surface.
 * @returns {boolean}
 */
function isValidJumpSurface(platform) {
  return [platform?.x, platform?.y, platform?.width].every(Number.isFinite) &&
    platform.width >= CHARACTER_LANDING_WIDTH;
}

/**
 * Returns numeric values that every jump configuration must provide.
 * @param {JumpPhysics} physics Gravity configuration to flatten.
 * @param {JumpCharacterConfig} character Character jump values to flatten.
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
