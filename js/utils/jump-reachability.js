const DEFAULT_FRAMES_PER_SECOND = 60;
const DEFAULT_SAFE_OVERLAP = 16;
const CHARACTER_LANDING_WIDTH = 32;

/**
 * Evaluates the exact discrete charge frames that can land a regular jump.
 * The result uses the same velocity interpolation and gravity as gameplay.
 */
export function evaluateJumpWindow(lower, upper, physics, character,
  options = {}) {
  validateJumpInputs(lower, upper, physics, character);
  const framesPerSecond = options.framesPerSecond ??
    DEFAULT_FRAMES_PER_SECOND;
  const safeOverlapPixels = options.safeOverlapPixels ?? DEFAULT_SAFE_OVERLAP;
  const maximumFrame = Math.ceil(character.jumpChargeSeconds * framesPerSecond);
  const samples = [];
  for (let frame = 0; frame <= maximumFrame; frame += 1) {
    const ratio = Math.min(1,
      frame / framesPerSecond / character.jumpChargeSeconds);
    const seconds = getDescendingFlightSeconds(lower.y - upper.y, ratio,
      physics, character);
    if (seconds === null) continue;
    for (const direction of [-1, 0, 1]) {
      const speed = interpolate(
        character.minimumJumpHorizontalSpeedPixelsPerSecond,
        character.maximumJumpHorizontalSpeedPixelsPerSecond,
        ratio,
      );
      const distance = direction * speed * seconds;
      if (!canLandAtDistance(lower, upper, distance, safeOverlapPixels)) continue;
      samples.push(Object.freeze({ frame, ratio, direction, seconds, distance }));
    }
  }
  const chargeFrames = [...new Set(samples.map(({ frame }) => frame))];
  return Object.freeze({
    samples: Object.freeze(samples),
    chargeFrames: Object.freeze(chargeFrames),
    frameCount: chargeFrames.length,
    minimumFrame: chargeFrames[0] ?? null,
    maximumFrame: chargeFrames.at(-1) ?? null,
    fullChargeWorks: chargeFrames.includes(maximumFrame),
    maximumFrame,
  });
}

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

function interpolate(minimum, maximum, ratio) {
  return minimum + (maximum - minimum) * ratio;
}

function validateJumpInputs(lower, upper, physics, character) {
  const platformsAreValid = [lower, upper].every((platform) => {
    return [platform?.x, platform?.y, platform?.width].every(Number.isFinite) &&
      platform.width >= CHARACTER_LANDING_WIDTH;
  });
  const values = [
    physics?.gravityPixelsPerSecondSquared,
    character?.jumpChargeSeconds,
    character?.minimumJumpSpeedPixelsPerSecond,
    character?.maximumJumpSpeedPixelsPerSecond,
    character?.minimumJumpHorizontalSpeedPixelsPerSecond,
    character?.maximumJumpHorizontalSpeedPixelsPerSecond,
  ];
  if (platformsAreValid && values.every((value) => {
    return Number.isFinite(value) && value > 0;
  })) return;
  throw new TypeError("The jump-reachability input is invalid.");
}
