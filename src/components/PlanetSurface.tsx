"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface PlanetSurfaceProps {
  surfaceColor: string;
  skyColor: string;
  planetId: string;
}

const PLANET_RADIUS = 80;
const TEX_SIZE = 512;

// Per-planet material properties
const PLANET_MATERIALS: Record<string, {
  roughness: number;
  metalness: number;
  bumpScale: number;
  emissiveColor?: string;
  emissiveIntensity?: number;
  secondaryColor?: string;
}> = {
  earth: { roughness: 0.85, metalness: 0.05, bumpScale: 0.4, secondaryColor: "#3a7a3a" },
  moon: { roughness: 0.95, metalness: 0.0, bumpScale: 1.0, secondaryColor: "#666666" },
  mars: { roughness: 0.9, metalness: 0.02, bumpScale: 0.8, secondaryColor: "#a03008" },
  jupiter: { roughness: 0.7, metalness: 0.1, bumpScale: 0.15, secondaryColor: "#a07838" },
  sun: { roughness: 0.3, metalness: 0.2, bumpScale: 0.5, emissiveColor: "#ff4400", emissiveIntensity: 0.6, secondaryColor: "#ff2200" },
  pluto: { roughness: 0.8, metalness: 0.05, bumpScale: 0.6, secondaryColor: "#c0b090" },
  europa: { roughness: 0.4, metalness: 0.15, bumpScale: 0.4, secondaryColor: "#90b8c0" },
  titan: { roughness: 0.85, metalness: 0.0, bumpScale: 0.5, secondaryColor: "#886020" },
};

/**
 * Simple hash-based pseudo-random for deterministic noise.
 */
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h ^ (h >> 16)) / 2147483648;
}

/**
 * Smooth value noise with cosine interpolation.
 */
function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  // Cosine interpolation for smoother results
  const sx = (1 - Math.cos(fx * Math.PI)) * 0.5;
  const sy = (1 - Math.cos(fy * Math.PI)) * 0.5;

  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;

  return nx0 + (nx1 - nx0) * sy;
}

/**
 * Fractal Brownian motion — layered noise for natural-looking terrain.
 */
function fbm(x: number, y: number, octaves: number = 5, lacunarity: number = 2.0, gain: number = 0.5): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Generate procedural bump and color textures using multi-octave noise.
 */
function generateTerrainTextures(planetId: string, size: number = TEX_SIZE): {
  bumpMap: THREE.DataTexture;
  colorMap: THREE.DataTexture;
} {
  const bumpData = new Uint8Array(size * size);
  const colorData = new Uint8Array(size * size * 4);

  const mat = PLANET_MATERIALS[planetId] ?? PLANET_MATERIALS.earth;
  const secondary = new THREE.Color(mat.secondaryColor ?? "#888888");

  // Offset seeds per planet so each looks unique
  const seed = planetId.charCodeAt(0) * 100 + planetId.charCodeAt(1) * 10;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      let bumpValue: number;
      let colorBlend: number; // 0 = base surfaceColor, 1 = secondaryColor

      switch (planetId) {
        case "moon": {
          // Cratered highlands with smooth maria
          const terrain = fbm(nx * 8 + seed, ny * 8, 5);
          bumpValue = terrain * 200 + 55;
          colorBlend = terrain;
          // Crater impacts
          for (let c = 0; c < 22; c++) {
            const cx = hash(c + seed, 0) * size;
            const cy = hash(0, c + seed) * size;
            const cr = 6 + (hash(c, c + seed) * 0.5 + 0.5) * 18;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cr) {
              const rim = 1 - dist / cr;
              bumpValue -= rim * rim * 80;
              colorBlend -= rim * 0.4;
              // Raised rim
              if (dist > cr * 0.75) {
                bumpValue += (dist / cr - 0.75) * 4 * 40;
              }
            }
          }
          break;
        }
        case "mars": {
          // Rocky desert with canyons and ridges
          const base = fbm(nx * 6 + seed, ny * 6, 5);
          const ridges = Math.abs(fbm(nx * 12 + seed, ny * 12 + 50, 4) - 0.5) * 2;
          bumpValue = base * 120 + ridges * 60 + 60;
          colorBlend = base * 0.6 + ridges * 0.3;
          // Dried river channels
          const river = Math.abs(Math.sin(nx * 3 + fbm(nx * 2, ny * 2 + seed, 3) * 4));
          if (river < 0.06) {
            bumpValue -= (1 - river / 0.06) * 50;
            colorBlend -= 0.3;
          }
          break;
        }
        case "europa": {
          // Smooth ice with crack networks
          const ice = fbm(nx * 4 + seed, ny * 4, 4, 2, 0.4);
          bumpValue = 200 + ice * 30;
          colorBlend = ice * 0.4 + 0.3;
          // Primary cracks
          const c1 = Math.sin(nx * 15 + fbm(nx * 3, ny * 3 + seed, 3) * 5)
                    + Math.cos(ny * 12 - fbm(nx * 2 + seed, ny * 2, 3) * 4);
          if (Math.abs(c1) < 0.18) {
            const depth = 1 - Math.abs(c1) / 0.18;
            bumpValue -= depth * 100;
            colorBlend = depth * 0.1;
          }
          // Secondary cracks (finer)
          const c2 = Math.sin(nx * 25 + ny * 8) + Math.cos(ny * 20 - nx * 12);
          if (Math.abs(c2) < 0.1) {
            bumpValue -= (1 - Math.abs(c2) / 0.1) * 40;
            colorBlend -= 0.15;
          }
          break;
        }
        case "sun": {
          // Turbulent convection cells
          const turb1 = fbm(nx * 5 + seed, ny * 5, 6, 2.2, 0.55);
          const turb2 = fbm(nx * 8 + 30, ny * 8 + seed, 5, 2, 0.5);
          const cell = Math.sin(turb1 * 8) * Math.cos(turb2 * 6);
          bumpValue = 100 + cell * 60 + turb1 * 40;
          colorBlend = cell * 0.5 + turb1 * 0.3 + 0.3;
          break;
        }
        case "titan": {
          // Smooth with methane dune ridges
          const smooth = fbm(nx * 3 + seed, ny * 3, 4, 2, 0.4);
          const dunes = (Math.sin(nx * 20 + smooth * 6) * 0.5 + 0.5);
          bumpValue = 140 + smooth * 30 + dunes * 50;
          colorBlend = smooth * 0.3 + dunes * 0.5;
          break;
        }
        case "pluto": {
          // Icy terrain with smooth nitrogen plains and rough highlands
          const base = fbm(nx * 5 + seed, ny * 5, 5);
          const plains = smoothNoise(nx * 2 + seed, ny * 2);
          // Heart-shaped smooth region (Sputnik Planitia analogue)
          const isPlain = plains > 0.55;
          bumpValue = isPlain
            ? 200 + fbm(nx * 8, ny * 8 + seed, 3) * 15
            : 160 + base * 60;
          colorBlend = isPlain ? 0.7 : base * 0.5;
          break;
        }
        case "jupiter": {
          // Atmospheric bands with turbulence
          const bandBase = ny * 10 + Math.sin(nx * 4 + seed) * 0.8;
          const band = Math.sin(bandBase) * 0.5 + 0.5;
          const turb = fbm(nx * 8 + seed, ny * 8, 4, 2.5, 0.45);
          bumpValue = 120 + band * 50 + turb * 30;
          colorBlend = band * 0.7 + turb * 0.2;
          break;
        }
        default: {
          // Earth — varied terrain
          const terrain = fbm(nx * 6 + seed, ny * 6, 5);
          const detail = fbm(nx * 15, ny * 15 + seed, 3);
          bumpValue = 130 + terrain * 80 + detail * 20;
          colorBlend = terrain * 0.6 + detail * 0.2;
        }
      }

      bumpData[y * size + x] = Math.max(0, Math.min(255, Math.round(bumpValue)));

      // Blend surface color with secondary color based on terrain
      const t = Math.max(0, Math.min(1, colorBlend));
      const idx = (y * size + x) * 4;
      colorData[idx]     = Math.round(secondary.r * 255 * (0.6 + t * 0.8));
      colorData[idx + 1] = Math.round(secondary.g * 255 * (0.6 + t * 0.8));
      colorData[idx + 2] = Math.round(secondary.b * 255 * (0.6 + t * 0.8));
      colorData[idx + 3] = 255;
    }
  }

  const bumpMap = new THREE.DataTexture(bumpData, size, size, THREE.RedFormat);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.magFilter = THREE.LinearFilter;
  bumpMap.minFilter = THREE.LinearMipmapLinearFilter;
  bumpMap.generateMipmaps = true;
  bumpMap.needsUpdate = true;

  const colorMap = new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.magFilter = THREE.LinearFilter;
  colorMap.minFilter = THREE.LinearMipmapLinearFilter;
  colorMap.generateMipmaps = true;
  colorMap.needsUpdate = true;

  return { bumpMap, colorMap };
}

export function PlanetSurface({ surfaceColor, skyColor, planetId }: PlanetSurfaceProps) {
  const mat = PLANET_MATERIALS[planetId] ?? PLANET_MATERIALS.earth;
  const { bumpMap, colorMap } = useMemo(() => generateTerrainTextures(planetId), [planetId]);

  return (
    <mesh
      position={[0, -PLANET_RADIUS, 0]}
      receiveShadow
    >
      {/* Partial sphere: top ~60% gives visible curvature at horizon */}
      <sphereGeometry args={[PLANET_RADIUS, 128, 64, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      <meshStandardMaterial
        color={surfaceColor}
        map={colorMap}
        roughness={mat.roughness}
        metalness={mat.metalness}
        bumpMap={bumpMap}
        bumpScale={mat.bumpScale}
        emissive={mat.emissiveColor ?? "#000000"}
        emissiveIntensity={mat.emissiveIntensity ?? 0}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
