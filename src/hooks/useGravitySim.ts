"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  calculateTimeScale,
  calculateImpactVelocity,
  calculateFallDuration,
} from "@/lib/physics";
import { DROP_HEIGHT } from "@/lib/constants";
import type { DropPhase } from "@/types";

export interface SimResult {
  position: number;
  velocity: number;
  impactVelocity: number;
  landed: boolean;
  /** Mutable ref for frame-accurate reads from other useFrame hooks */
  live: {
    position: number;
    velocity: number;
    bouncing: boolean;
  };
}

const MIN_BOUNCE_VELOCITY = 0.2;

export function useGravitySim(
  gravity: number,
  phase: DropPhase,
  restitution: number,
  onLand?: () => void
): SimResult {
  const timeScale = useRef(calculateTimeScale());
  const hasCalledOnLand = useRef(false);

  // Mutable physics state — updated every frame, no React lag
  const sim = useRef({
    position: DROP_HEIGHT,
    velocity: 0,
    impactVelocity: 0,
    landed: false,
    bouncing: false,
    bounceCount: 0,
  });

  // Shared live ref that DroppableObject reads synchronously
  const live = useRef({
    position: DROP_HEIGHT,
    velocity: 0,
    bouncing: false,
  });

  const [result, setResult] = useState<SimResult>({
    position: DROP_HEIGHT,
    velocity: 0,
    impactVelocity: 0,
    landed: false,
    live: live.current,
  });

  useEffect(() => {
    if (phase === "idle") {
      hasCalledOnLand.current = false;
      sim.current = {
        position: DROP_HEIGHT,
        velocity: 0,
        impactVelocity: 0,
        landed: false,
        bouncing: false,
        bounceCount: 0,
      };
      live.current.position = DROP_HEIGHT;
      live.current.velocity = 0;
      live.current.bouncing = false;
      setResult({
        position: DROP_HEIGHT,
        velocity: 0,
        impactVelocity: 0,
        landed: false,
        live: live.current,
      });
    }
  }, [phase]);

  useFrame((_, delta) => {
    if (phase !== "dropping" && phase !== "landed") return;

    const s = sim.current;
    const scaledDelta = delta / timeScale.current;

    // Fully settled
    if (s.landed && !s.bouncing) return;

    // --- First fall (only during dropping phase) ---
    if (!s.landed && phase === "dropping") {
      s.velocity += gravity * scaledDelta;
      s.position -= s.velocity * scaledDelta;

      if (s.position <= 0) {
        s.position = 0;
        s.impactVelocity = s.velocity;

        if (!hasCalledOnLand.current) {
          hasCalledOnLand.current = true;
          onLand?.();
        }

        const bounceVel = s.velocity * restitution;
        if (bounceVel > MIN_BOUNCE_VELOCITY) {
          s.bouncing = true;
          s.bounceCount = 1;
          s.velocity = bounceVel; // positive = upward during bounce phase
          s.landed = true;
        } else {
          s.velocity = 0;
          s.landed = true;
          s.bouncing = false;
        }

        // Update live ref
        live.current.position = 0;
        live.current.velocity = 0;
        live.current.bouncing = s.bouncing;

        setResult({
          position: 0,
          velocity: 0,
          impactVelocity: s.impactVelocity,
          landed: true,
          live: live.current,
        });
      } else {
        live.current.position = s.position;
        live.current.velocity = s.velocity;
        live.current.bouncing = false;

        setResult({
          position: s.position,
          velocity: s.velocity,
          impactVelocity: 0,
          landed: false,
          live: live.current,
        });
      }
      return;
    }

    // --- Bouncing phase ---
    // Convention: velocity is positive going up, gravity pulls it down
    s.velocity -= gravity * scaledDelta;
    s.position += s.velocity * scaledDelta;

    if (s.position <= 0 && s.velocity < 0) {
      s.position = 0;
      s.bounceCount += 1;

      const bounceVel = Math.abs(s.velocity) * restitution;
      if (bounceVel > MIN_BOUNCE_VELOCITY && s.bounceCount < 8) {
        s.velocity = bounceVel; // launch back up
      } else {
        s.velocity = 0;
        s.bouncing = false;
      }
    }

    live.current.position = Math.max(0, s.position);
    live.current.velocity = Math.abs(s.velocity);
    live.current.bouncing = s.bouncing;

    setResult({
      position: Math.max(0, s.position),
      velocity: Math.abs(s.velocity),
      impactVelocity: s.impactVelocity,
      landed: true,
      live: live.current,
    });
  });

  return result;
}

export function getExpectedDuration(gravity: number): number {
  const realDuration = calculateFallDuration(gravity);
  const timeScale = calculateTimeScale();
  return realDuration / timeScale;
}
