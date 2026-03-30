"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useGravitySim } from "@/hooks/useGravitySim";
import { simStore } from "@/hooks/useSimStore";
import { springStep, springSettled, wobble } from "@/lib/springPhysics";
import { calculateSquash, getMaxVelocity } from "@/lib/physics";
import type { DropPhase } from "@/types";

interface DroppableObjectProps {
  gravity: number;
  phase: DropPhase;
  fallbackColor: string;
  scale: number;
  squashFactor: number;
  side: "left" | "right";
  onLand?: () => void;
}

const SCENE_SCALE = 0.5;

// Spring config for impact squash recovery
const SQUASH_STIFFNESS = 180;
const SQUASH_DAMPING = 8;

export function DroppableObject({
  gravity,
  phase,
  fallbackColor,
  scale,
  squashFactor,
  side,
  onLand,
}: DroppableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const sim = useGravitySim(gravity, phase, onLand);

  // Spring state for squash recovery
  const squashSpring = useRef({ scaleY: 1, velY: 0 });
  // Wobble timer
  const wobbleTimer = useRef(0);
  // Track if we just landed (for triggering squash)
  const wasLanded = useRef(false);
  // Anticipation animation progress
  const anticipationProgress = useRef(0);

  // Push sim data to the store for HUD consumption
  const setter = side === "left" ? simStore.setLeft : simStore.setRight;
  setter(sim);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const maxVel = getMaxVelocity(gravity);
    let sy = 1;
    let sxz = 1;
    let yPos = sim.position * SCENE_SCALE + scale * 0.5;

    if (phase === "anticipation") {
      // Wind-up squash: compress downward
      anticipationProgress.current = Math.min(anticipationProgress.current + delta * 8, 1);
      const t = anticipationProgress.current;
      // Ease in-out
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      sy = 1 - ease * 0.2 * squashFactor;
      sxz = 1 / Math.sqrt(sy);
      // Stay at drop height
      yPos = 20 * SCENE_SCALE + scale * 0.5;
    } else if (phase === "dropping" && !sim.landed) {
      // Reset anticipation
      anticipationProgress.current = 0;
      // Stretch during fall based on velocity
      const squashResult = calculateSquash(sim.velocity, maxVel, squashFactor, false);
      sy = squashResult.scaleY;
      sxz = squashResult.scaleX;
    } else if (sim.landed) {
      if (!wasLanded.current) {
        // Just landed — initialize squash spring with impact deformation
        const impactSquash = calculateSquash(sim.impactVelocity, maxVel, squashFactor, true);
        squashSpring.current = { scaleY: impactSquash.scaleY, velY: 0 };
        wobbleTimer.current = 0;
        wasLanded.current = true;
      }

      // Spring back to 1.0
      const spring = springStep(
        squashSpring.current.scaleY,
        1,
        squashSpring.current.velY,
        SQUASH_STIFFNESS,
        SQUASH_DAMPING,
        delta
      );
      squashSpring.current.scaleY = spring.value;
      squashSpring.current.velY = spring.velocity;

      // Add jelly wobble on top
      wobbleTimer.current += delta;
      const wobbleAmount = wobble(wobbleTimer.current, 6, 4, 0.08 * squashFactor);

      sy = spring.value + wobbleAmount;
      sxz = 1 / Math.sqrt(Math.max(sy, 0.1));

      // Object sits on the ground
      yPos = scale * 0.5 * sy;
    } else {
      // idle — reset everything
      wasLanded.current = false;
      anticipationProgress.current = 0;
      squashSpring.current = { scaleY: 1, velY: 0 };
      wobbleTimer.current = 0;
    }

    mesh.position.y = yPos;
    mesh.scale.set(sxz, Math.max(sy, 0.1), sxz);
  });

  // Wrap in Float for idle bobbing (only when idle)
  const box = (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[scale, scale, scale]} />
      <meshStandardMaterial color={fallbackColor} roughness={0.4} />
    </mesh>
  );

  if (phase === "idle") {
    return (
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5} floatingRange={[-0.15, 0.15]}>
        <group position={[0, 20 * SCENE_SCALE + scale * 0.5, 0]}>
          {box}
        </group>
      </Float>
    );
  }

  return box;
}
