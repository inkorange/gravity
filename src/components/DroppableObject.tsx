"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useGravitySim } from "@/hooks/useGravitySim";
import type { DropPhase } from "@/types";

interface DroppableObjectProps {
  gravity: number;
  phase: DropPhase;
  fallbackColor: string;
  scale: number;
  onLand?: () => void;
}

export function DroppableObject({
  gravity,
  phase,
  fallbackColor,
  scale,
  onLand,
}: DroppableObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const sim = useGravitySim(gravity, phase, onLand);

  // Convert physics position (meters) to scene units
  // Scale down so the scene looks reasonable: 1 meter = 0.5 scene units
  const sceneScale = 0.5;
  const yPos = sim.position * sceneScale + scale * 0.5;

  return (
    <mesh ref={meshRef} position={[0, yPos, 0]} castShadow>
      <boxGeometry args={[scale, scale, scale]} />
      <meshStandardMaterial color={fallbackColor} roughness={0.4} />
    </mesh>
  );
}
