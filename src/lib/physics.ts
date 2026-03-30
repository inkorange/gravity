import {
  DROP_HEIGHT,
  TARGET_EARTH_DURATION,
  EARTH_GRAVITY,
  DEFAULT_RESTITUTION,
} from "./constants";

/**
 * Calculate the real (unscaled) fall duration for a given gravity.
 * Uses: t = sqrt(2h / g)
 */
export function calculateFallDuration(
  gravity: number,
  dropHeight: number = DROP_HEIGHT
): number {
  return Math.sqrt((2 * dropHeight) / gravity);
}

/**
 * Calculate the time scale multiplier so that Earth drops take
 * TARGET_EARTH_DURATION seconds. All planets use the same multiplier
 * to preserve real relative differences.
 */
export function calculateTimeScale(): number {
  const realEarthDuration = calculateFallDuration(EARTH_GRAVITY);
  return realEarthDuration / TARGET_EARTH_DURATION;
}

/**
 * Calculate position (height above ground) at a given elapsed time.
 * Returns 0 when the object has reached the ground.
 * Time should already be scaled by the caller.
 */
export function calculatePosition(
  gravity: number,
  time: number,
  dropHeight: number = DROP_HEIGHT
): number {
  const y = dropHeight - 0.5 * gravity * time * time;
  return Math.max(0, y);
}

/**
 * Calculate velocity at a given elapsed time.
 * Returns a positive value representing downward speed.
 */
export function calculateVelocity(gravity: number, time: number): number {
  return gravity * time;
}

/**
 * Calculate the impact velocity when hitting the ground from dropHeight.
 * Uses: v = sqrt(2 * g * h)
 */
export function calculateImpactVelocity(
  gravity: number,
  dropHeight: number = DROP_HEIGHT
): number {
  return Math.sqrt(2 * gravity * dropHeight);
}

/**
 * Calculate bounce parameters after an impact.
 * Each successive bounce loses energy based on restitution coefficient.
 * Returns the height and duration of the bounce at the given index.
 */
export function calculateBounce(
  impactVelocity: number,
  gravity: number,
  bounceIndex: number,
  restitution: number = DEFAULT_RESTITUTION
): { height: number; duration: number } {
  // Each bounce, velocity is multiplied by restitution
  const bounceVelocity = impactVelocity * Math.pow(restitution, bounceIndex);

  // Max height of this bounce: h = v² / (2g)
  const height = (bounceVelocity * bounceVelocity) / (2 * gravity);

  // Duration of full bounce (up and down): t = 2v / g
  const duration = (2 * bounceVelocity) / gravity;

  return { height, duration };
}

/**
 * Calculate squash-and-stretch scale values based on current velocity.
 * Returns volume-preserving deformation: when Y compresses, XZ expand.
 *
 * @param velocity - Current downward velocity
 * @param maxVelocity - Maximum expected velocity (for normalization)
 * @param squashFactor - Per-object squash intensity (0 = rigid, 1 = very squishy)
 * @param isImpact - If true, applies impact squash (flattening). If false, applies fall stretch (elongation).
 */
export function calculateSquash(
  velocity: number,
  maxVelocity: number,
  squashFactor: number,
  isImpact: boolean
): { scaleX: number; scaleY: number; scaleZ: number } {
  const normalizedVelocity = Math.min(velocity / maxVelocity, 1);
  const deformation = normalizedVelocity * squashFactor;

  if (isImpact) {
    // Impact: flatten Y, expand XZ
    const scaleY = Math.max(1 - deformation * 0.7, 0.15);
    const scaleXZ = 1 / Math.sqrt(scaleY);
    return { scaleX: scaleXZ, scaleY, scaleZ: scaleXZ };
  } else {
    // Falling: stretch Y, compress XZ
    const scaleY = 1 + deformation * 0.3;
    const scaleXZ = 1 / Math.sqrt(scaleY);
    return { scaleX: scaleXZ, scaleY, scaleZ: scaleXZ };
  }
}

/**
 * Get the maximum velocity an object will reach during a drop.
 * This is the impact velocity — useful for normalizing squash calculations.
 */
export function getMaxVelocity(
  gravity: number,
  dropHeight: number = DROP_HEIGHT
): number {
  return calculateImpactVelocity(gravity, dropHeight);
}

/**
 * Calculate the scaled fall duration for display/gameplay purposes.
 * This is how long the drop actually takes in the app.
 */
export function getScaledFallDuration(gravity: number): number {
  const realDuration = calculateFallDuration(gravity);
  const timeScale = calculateTimeScale();
  return realDuration / timeScale;
}
