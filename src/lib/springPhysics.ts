/**
 * Damped spring solver for cartoon animations.
 * Returns new value and velocity after one time step.
 */
export function springStep(
  current: number,
  target: number,
  velocity: number,
  stiffness: number,
  damping: number,
  dt: number
): { value: number; velocity: number } {
  const force = -stiffness * (current - target);
  const dampingForce = -damping * velocity;
  const acceleration = force + dampingForce;
  const newVelocity = velocity + acceleration * dt;
  const newValue = current + newVelocity * dt;
  return { value: newValue, velocity: newVelocity };
}

/**
 * Check if a spring has settled (close enough to target with negligible velocity).
 */
export function springSettled(
  current: number,
  target: number,
  velocity: number,
  threshold: number = 0.001
): boolean {
  return Math.abs(current - target) < threshold && Math.abs(velocity) < threshold;
}

/**
 * Compute a decaying sine wobble.
 * Returns a value oscillating around 0 that decays over time.
 * Useful for post-impact jelly wobble.
 */
export function wobble(
  elapsed: number,
  frequency: number,
  decay: number,
  amplitude: number
): number {
  return amplitude * Math.sin(elapsed * frequency * Math.PI * 2) * Math.exp(-decay * elapsed);
}
