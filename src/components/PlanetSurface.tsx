"use client";

import { useRef } from "react";
import * as THREE from "three";

interface PlanetSurfaceProps {
  surfaceColor: string;
  skyColor: string;
}

export function PlanetSurface({ surfaceColor }: PlanetSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color={surfaceColor} roughness={0.8} />
    </mesh>
  );
}
