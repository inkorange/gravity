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
  secondaryColor?: string;
}> = {
  earth: { roughness: 0.85, metalness: 0.05, bumpScale: 0.3, secondaryColor: "#3a7a3a" },
  moon: { roughness: 0.95, metalness: 0.0, bumpScale: 0.8, secondaryColor: "#666666" },
  mars: { roughness: 0.9, metalness: 0.02, bumpScale: 0.6, secondaryColor: "#a03008" },
  jupiter: { roughness: 0.7, metalness: 0.1, bumpScale: 0.1, secondaryColor: "#a07838" },
  sun: { roughness: 0.3, metalness: 0.2, bumpScale: 0.4, emissiveColor: "#ff4400", emissiveIntensity: 0.6, secondaryColor: "#ff2200" },
  pluto: { roughness: 0.8, metalness: 0.05, bumpScale: 0.5, secondaryColor: "#c0b090" },
  europa: { roughness: 0.4, metalness: 0.15, bumpScale: 0.3, secondaryColor: "#90b8c0" },
  titan: { roughness: 0.85, metalness: 0.0, bumpScale: 0.4, secondaryColor: "#886020" },
};

/**
 * Generate a procedural bump/height texture with color variation for terrain.
 * Returns both a bump map and a color map for richer visual detail.
 */
function generateTerrainTextures(planetId: string, size: number = 256): {
  bumpMap: THREE.DataTexture;
  colorMap: THREE.DataTexture;
} {
  const bumpData = new Uint8Array(size * size);
  const colorData = new Uint8Array(size * size * 4); // RGBA

  const mat = PLANET_MATERIALS[planetId] ?? PLANET_MATERIALS.earth;
  const baseColor = new THREE.Color(mat.secondaryColor ?? "#888888");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bumpValue: number;
      let colorVariation = 0; // -1 to 1, blends between base and secondary

      // Perlin-like noise approximation using layered sine waves
      const nx = x / size;
      const ny = y / size;
      const noise1 = Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453;
      const fineNoise = (noise1 - Math.floor(noise1)) * 2 - 1;

      switch (planetId) {
        case "moon":
          // Cratered surface with varied terrain
          bumpValue = 180 + fineNoise * 15;
          colorVariation = fineNoise * 0.3;
          for (let c = 0; c < 18; c++) {
            const cx = ((c * 73 + 17) % size);
            const cy = ((c * 137 + 53) % size);
            const cr = 6 + (c % 7) * 5;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cr) {
              const rim = 1 - dist / cr;
              bumpValue -= rim * 90;
              colorVariation -= rim * 0.5;
              // Crater rim (raised edge)
              if (dist > cr * 0.7 && dist < cr) {
                bumpValue += 30;
              }
            }
          }
          break;
        case "mars":
          // Rocky desert with ridges and dried river beds
          bumpValue = 140 + Math.sin(x * 0.05 + y * 0.03) * 30
            + Math.sin(x * 0.12 - y * 0.08) * 15
            + fineNoise * 20;
          colorVariation = Math.sin(x * 0.03 + y * 0.02) * 0.4 + fineNoise * 0.2;
          // Dried river channel
          if (Math.abs(Math.sin(x * 0.02 + Math.sin(y * 0.015) * 3)) < 0.08) {
            bumpValue -= 40;
            colorVariation -= 0.4;
          }
          break;
        case "europa":
          // Cracked ice with varied surface
          bumpValue = 200 + fineNoise * 10;
          colorVariation = fineNoise * 0.2;
          // Multiple ice crack patterns at different scales
          const crack1 = Math.sin(x * 0.1 + y * 0.02) + Math.cos(y * 0.08 - x * 0.03);
          const crack2 = Math.sin(x * 0.05 - y * 0.07) + Math.cos(y * 0.04 + x * 0.06);
          if (Math.abs(crack1) < 0.12) {
            bumpValue -= 90;
            colorVariation = -0.7;
          }
          if (Math.abs(crack2) < 0.08) {
            bumpValue -= 50;
            colorVariation -= 0.3;
          }
          break;
        case "sun":
          // Turbulent lava-like surface with convection cells
          const cell = Math.sin(x * 0.08 + Math.sin(y * 0.05) * 2) * Math.cos(y * 0.06 + Math.sin(x * 0.04) * 2);
          bumpValue = 100 + cell * 50 + fineNoise * 25;
          colorVariation = cell * 0.6 + fineNoise * 0.3;
          break;
        case "titan":
          // Smooth with dune ridges
          const dune = Math.sin(x * 0.04 + Math.sin(y * 0.01) * 2) * 0.5 + 0.5;
          bumpValue = 150 + dune * 40 + fineNoise * 10;
          colorVariation = dune * 0.4 + fineNoise * 0.15;
          break;
        case "pluto":
          // Icy with heart-shaped smooth region and rough terrain
          bumpValue = 190 + Math.sin(x * 0.04 + y * 0.06) * 15
            + Math.sin(x * 0.1) * 8 + fineNoise * 8;
          colorVariation = Math.sin(x * 0.03) * 0.3 + fineNoise * 0.15;
          break;
        case "jupiter":
          // Gas bands
          const band = Math.sin(y * 0.08 + Math.sin(x * 0.02) * 1.5);
          bumpValue = 130 + band * 30 + fineNoise * 10;
          colorVariation = band * 0.5 + fineNoise * 0.2;
          break;
        default:
          // Earth — varied terrain with patches
          bumpValue = 150 + Math.sin(x * 0.06) * 20 + Math.sin(y * 0.08 + x * 0.03) * 15 + fineNoise * 15;
          colorVariation = Math.sin(x * 0.04 + y * 0.05) * 0.3 + fineNoise * 0.2;
      }

      bumpData[y * size + x] = Math.max(0, Math.min(255, Math.round(bumpValue)));

      // Generate color map with variation
      const blend = Math.max(0, Math.min(1, colorVariation * 0.5 + 0.5));
      const idx = (y * size + x) * 4;
      colorData[idx] = Math.round(baseColor.r * 255 * (0.7 + blend * 0.6));
      colorData[idx + 1] = Math.round(baseColor.g * 255 * (0.7 + blend * 0.6));
      colorData[idx + 2] = Math.round(baseColor.b * 255 * (0.7 + blend * 0.6));
      colorData[idx + 3] = 255;
    }
  }

  const bumpMap = new THREE.DataTexture(bumpData, size, size, THREE.RedFormat);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.needsUpdate = true;

  const colorMap = new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.needsUpdate = true;

  return { bumpMap, colorMap };
}

export function PlanetSurface({ surfaceColor, skyColor, planetId }: PlanetSurfaceProps) {
  const mat = PLANET_MATERIALS[planetId] ?? PLANET_MATERIALS.earth;

  const { bumpMap, colorMap } = useMemo(() => generateTerrainTextures(planetId), [planetId]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
    >
      <planeGeometry args={[60, 60, 128, 128]} />
      <meshStandardMaterial
        color={surfaceColor}
        map={colorMap}
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
