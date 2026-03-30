"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useGravitySim } from "@/hooks/useGravitySim";
import { simStore } from "@/hooks/useSimStore";
import type { DropPhase } from "@/types";

interface DroppableObjectProps {
  gravity: number;
  phase: DropPhase;
  fallbackColor: string;
  scale: number;
  side: "left" | "right";
  onLand?: () => void;
}

export function DroppableObject({
  gravity,
  phase,
  fallbackColor,
  scale,
  side,
  onLand,
}: DroppableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const sim = useGravitySim(gravity, phase, onLand);

  // Push sim data to the store for HUD consumption
  const setter = side === "left" ? simStore.setLeft : simStore.setRight;
  setter(sim);

  // Reset store when phase goes idle
  useEffect(() => {
    if (phase === "idle") {
      simStore.reset();
    }
  }, [phase]);

  // Convert physics position (meters) to scene units
  const sceneScale = 0.5;
  const yPos = sim.position * sceneScale + scale * 0.5;

  return (
    <mesh ref={meshRef} position={[0, yPos, 0]} castShadow>
      <boxGeometry args={[scale, scale, scale]} />
      <meshStandardMaterial color={fallbackColor} roughness={0.4} />
    </mesh>
  );
}
