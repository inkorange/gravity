"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface PlanetSurfaceProps {
  surfaceColor: string;
  skyColor: string;
  planetId: string;
}

// Per-planet material properties for distinct visual identity
const PLANET_MATERIALS: Record<string, {
  roughness: number;
  metalness: number;
  bumpScale: number;
  emissiveColor?: string;
  emissiveIntensity?: number;
}> = {
  earth: { roughness: 0.85, metalness: 0.05, bumpScale: 0.3 },
  moon: { roughness: 0.95, metalness: 0.0, bumpScale: 0.8 },
  mars: { roughness: 0.9, metalness: 0.02, bumpScale: 0.6 },
  jupiter: { roughness: 0.7, metalness: 0.1, bumpScale: 0.1 },
  sun: { roughness: 0.3, metalness: 0.2, bumpScale: 0.4, emissiveColor: "#ff4400", emissiveIntensity: 0.4 },
  pluto: { roughness: 0.8, metalness: 0.05, bumpScale: 0.5 },
  europa: { roughness: 0.4, metalness: 0.15, bumpScale: 0.3 },
  titan: { roughness: 0.85, metalness: 0.0, bumpScale: 0.4 },
};

/**
 * Generate a procedural bump/height texture for terrain variation.
 */
function generateTerrainTexture(planetId: string, size: number = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value: number;

      switch (planetId) {
        case "moon":
          // Cratered surface — random circles of darkness
          value = 180 + Math.random() * 40;
          // Simulate craters with distance-based darkening
          for (let c = 0; c < 12; c++) {
            const cx = ((c * 73 + 17) % size);
            const cy = ((c * 137 + 53) % size);
            const cr = 8 + (c % 5) * 6;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cr) {
              value -= (1 - dist / cr) * 80;
            }
          }
          break;
        case "mars":
          // Rocky desert with ridges
          value = 140 + Math.sin(x * 0.05 + y * 0.03) * 30 + Math.random() * 25;
          break;
        case "europa":
          // Cracked ice patterns
          value = 200 + Math.random() * 20;
          // Ice cracks
          if (Math.abs(Math.sin(x * 0.1 + y * 0.02) + Math.cos(y * 0.08 - x * 0.03)) < 0.15) {
            value -= 80;
          }
          break;
        case "sun":
          // Turbulent, lava-like
          value = 100 + Math.sin(x * 0.08) * 40 + Math.cos(y * 0.06 + x * 0.04) * 40 + Math.random() * 30;
          break;
        case "titan":
          // Smooth with occasional dunes
          value = 160 + Math.sin(x * 0.03) * 20 + Math.random() * 15;
          break;
        case "pluto":
          // Icy, relatively smooth with some variation
          value = 190 + Math.sin(x * 0.04 + y * 0.06) * 15 + Math.random() * 10;
          break;
        default:
          // Earth — grassy terrain
          value = 150 + Math.sin(x * 0.06) * 20 + Math.random() * 20;
      }

      data[y * size + x] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function PlanetSurface({ surfaceColor, skyColor, planetId }: PlanetSurfaceProps) {
  const mat = PLANET_MATERIALS[planetId] ?? PLANET_MATERIALS.earth;

  const bumpMap = useMemo(() => generateTerrainTexture(planetId), [planetId]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[60, 60, 64, 64]} />
      <meshStandardMaterial
        color={surfaceColor}
        roughness={mat.roughness}
        metalness={mat.metalness}
        bumpMap={bumpMap}
        bumpScale={mat.bumpScale}
        emissive={mat.emissiveColor ?? "#000000"}
        emissiveIntensity={mat.emissiveIntensity ?? 0}
      />
    </mesh>
  );
}
