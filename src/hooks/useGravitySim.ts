"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  calculatePosition,
  calculateVelocity,
  calculateTimeScale,
  calculateImpactVelocity,
  calculateFallDuration,
} from "@/lib/physics";
import { DROP_HEIGHT } from "@/lib/constants";
import type { DropPhase } from "@/types";

interface SimResult {
  position: number;
  velocity: number;
  impactVelocity: number;
  landed: boolean;
}

export function useGravitySim(
  gravity: number,
  phase: DropPhase,
  onLand?: () => void
): SimResult {
  const elapsed = useRef(0);
  const timeScale = useRef(calculateTimeScale());
  const hasLanded = useRef(false);
  const [result, setResult] = useState<SimResult>({
    position: DROP_HEIGHT,
    velocity: 0,
    impactVelocity: 0,
    landed: false,
  });

  useFrame((_, delta) => {
    if (phase === "idle") {
      if (elapsed.current !== 0) {
        elapsed.current = 0;
        hasLanded.current = false;
        setResult({
          position: DROP_HEIGHT,
          velocity: 0,
          impactVelocity: 0,
          landed: false,
        });
      }
      return;
    }

    if (phase !== "dropping" || hasLanded.current) return;

    // Scale delta by the time scale so physics runs at the right speed
    const scaledDelta = delta / timeScale.current;
    elapsed.current += scaledDelta;

    const pos = calculatePosition(gravity, elapsed.current);
    const vel = calculateVelocity(gravity, elapsed.current);

    if (pos <= 0) {
      // Hit the ground
      const impactVel = calculateImpactVelocity(gravity);
      hasLanded.current = true;
      setResult({
        position: 0,
        velocity: 0,
        impactVelocity: impactVel,
        landed: true,
      });
      onLand?.();
    } else {
      setResult({
        position: pos,
        velocity: vel,
        impactVelocity: 0,
        landed: false,
      });
    }
  });

  return result;
}

/**
 * Get the expected scaled duration for a drop on this planet.
 * Useful for UI display.
 */
export function getExpectedDuration(gravity: number): number {
  const realDuration = calculateFallDuration(gravity);
  const timeScale = calculateTimeScale();
  return realDuration / timeScale;
}
