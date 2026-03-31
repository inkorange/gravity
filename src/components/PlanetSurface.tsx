"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface PlanetSurfaceProps {
  surfaceColor: string;
  skyColor: string;
  planetId: string;
}

const PLANET_RADIUS = 80;
const PLANE_SIZE = 80;
const PLANE_SEGMENTS = 200;
const TEX_SIZE = 1024;

// Per-planet material properties
const PLANET_MATERIALS: Record<string, {
  roughness: number;
  metalness: number;
  bumpScale: number;
  emissiveColor?: string;
  emissiveIntensity?: number;
  secondaryColor?: string;
  tertiaryColor?: string;
}> = {
  earth:   { roughness: 0.85, metalness: 0.05, bumpScale: 0.5, secondaryColor: "#4a9a3a", tertiaryColor: "#8b6d3f" },
  moon:    { roughness: 0.95, metalness: 0.0,  bumpScale: 1.2, secondaryColor: "#9a9a9a", tertiaryColor: "#505050" },
  mars:    { roughness: 0.9,  metalness: 0.02, bumpScale: 0.9, secondaryColor: "#d4713a", tertiaryColor: "#7a2800" },
  jupiter: { roughness: 0.7,  metalness: 0.1,  bumpScale: 0.2, secondaryColor: "#d4a050", tertiaryColor: "#8a5020" },
  sun:     { roughness: 0.3,  metalness: 0.2,  bumpScale: 0.6, emissiveColor: "#ff4400", emissiveIntensity: 0.6, secondaryColor: "#ffaa22", tertiaryColor: "#cc2200" },
  pluto:   { roughness: 0.8,  metalness: 0.05, bumpScale: 0.7, secondaryColor: "#e0d4c0", tertiaryColor: "#907858" },
  europa:  { roughness: 0.4,  metalness: 0.15, bumpScale: 0.5, secondaryColor: "#d0e8f0", tertiaryColor: "#607080" },
  titan:   { roughness: 0.85, metalness: 0.0,  bumpScale: 0.6, secondaryColor: "#c09030", tertiaryColor: "#604818" },
};

// --- Noise functions ---

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);

  return n00 + (n10 - n00) * sx + (n01 - n00) * sy + (n00 - n10 - n01 + n11) * sx * sy;
}

function fbm(x: number, y: number, octaves: number, lacunarity: number = 2.0, gain: number = 0.5): number {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * freq, y * freq) * amp;
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return value / maxAmp;
}

function ridgeNoise(x: number, y: number, octaves: number): number {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  let prev = 1;
  for (let i = 0; i < octaves; i++) {
    let n = Math.abs(smoothNoise(x * freq, y * freq) * 2 - 1);
    n = 1 - n;
    n = n * n;
    n *= prev;
    prev = n;
    value += n * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return value / maxAmp;
}

// --- Curved plane geometry ---

/**
 * Creates a plane geometry whose vertices are displaced downward
 * based on distance from center, following a sphere surface.
 * This gives curved-horizon effect without UV pole pinching.
 */
function createCurvedPlaneGeometry(
  size: number,
  segments: number,
  radius: number,
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2); // lay flat

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const distSq = x * x + z * z;
    // Sphere surface approximation: y = R - sqrt(R² - d²)
    // For large R this is ≈ d²/(2R), but using exact formula for accuracy
    const y = distSq < radius * radius
      ? radius - Math.sqrt(radius * radius - distSq)
      : radius; // clamp at edge
    pos.setY(i, -y);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// --- Texture generation ---

function generateTerrainTextures(
  planetId: string,
  surfaceColor: string,
  size: number = TEX_SIZE,
): { bumpMap: THREE.DataTexture; colorMap: THREE.DataTexture } {
  const bumpData = new Uint8Array(size * size);
  const colorData = new Uint8Array(size * size * 4);

  const mat = PLANET_MATERIALS[planetId] ?? PLANET_MATERIALS.earth;
  const colA = new THREE.Color(surfaceColor);
  const colB = new THREE.Color(mat.secondaryColor!);
  const colC = new THREE.Color(mat.tertiaryColor!);
  const tmp = new THREE.Color();

  const seed = planetId.charCodeAt(0) * 137 + (planetId.charCodeAt(1) ?? 0) * 31;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size;
      const ny = py / size;

      let bump: number;
      let t1: number;
      let t2: number = 0;

      switch (planetId) {
        case "moon": {
          const base = fbm(nx * 10 + seed, ny * 10, 6);
          const fine = fbm(nx * 40 + seed, ny * 40, 4, 2.2, 0.45);
          bump = base * 160 + fine * 50 + 40;
          t1 = base * 0.7 + fine * 0.3;
          for (let c = 0; c < 28; c++) {
            const cx = hash(c + seed, 7) * size;
            const cy = hash(13, c + seed) * size;
            const cr = 5 + hash(c, c + seed) * 20;
            const dx = px - cx; const dy = py - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cr) {
              const r = dist / cr;
              if (r < 0.7) {
                bump -= (1 - r / 0.7) * 90;
                t2 += (1 - r / 0.7) * 0.6;
              } else {
                bump += (1 - (r - 0.7) / 0.3) * 35;
              }
            }
          }
          break;
        }
        case "mars": {
          const base = fbm(nx * 8 + seed, ny * 8, 6);
          const ridge = ridgeNoise(nx * 6 + seed, ny * 6, 5);
          const fine = fbm(nx * 30, ny * 30 + seed, 4, 2, 0.45);
          bump = base * 100 + ridge * 60 + fine * 40 + 50;
          t1 = base * 0.5 + ridge * 0.3 + fine * 0.2;
          const river = Math.abs(Math.sin(nx * 4 + fbm(nx * 3, ny * 2 + seed, 3) * 5));
          if (river < 0.05) {
            const depth = 1 - river / 0.05;
            bump -= depth * 60;
            t2 += depth * 0.7;
          }
          break;
        }
        case "europa": {
          const ice = fbm(nx * 5 + seed, ny * 5, 5, 2, 0.4);
          const fine = fbm(nx * 35, ny * 35 + seed, 4, 2, 0.5);
          bump = 190 + ice * 25 + fine * 15;
          t1 = ice * 0.3 + fine * 0.15 + 0.3;
          const warp = fbm(nx * 4, ny * 4 + seed, 3);
          const c1 = Math.sin(nx * 18 + warp * 6) + Math.cos(ny * 14 - warp * 5);
          if (Math.abs(c1) < 0.15) {
            const d = 1 - Math.abs(c1) / 0.15;
            bump -= d * d * 110;
            t2 += d * 0.8;
          }
          const c2 = Math.sin(nx * 30 + ny * 10 + seed) + Math.cos(ny * 25 - nx * 15);
          if (Math.abs(c2) < 0.09) {
            const d = 1 - Math.abs(c2) / 0.09;
            bump -= d * 50;
            t2 += d * 0.4;
          }
          break;
        }
        case "sun": {
          const t1n = fbm(nx * 6 + seed, ny * 6, 7, 2.2, 0.55);
          const t2n = fbm(nx * 12 + 50, ny * 12 + seed, 5, 2, 0.5);
          const cell = Math.sin(t1n * 10) * Math.cos(t2n * 8);
          const fine = fbm(nx * 25 + seed, ny * 25, 4, 2, 0.4);
          bump = 90 + cell * 55 + t1n * 40 + fine * 25;
          t1 = cell * 0.4 + t1n * 0.3 + 0.3;
          t2 = Math.max(0, -cell * 0.5) + fine * 0.2;
          break;
        }
        case "titan": {
          const base = fbm(nx * 4 + seed, ny * 4, 5, 2, 0.45);
          const dune = Math.sin(nx * 24 + base * 7) * 0.5 + 0.5;
          const fine = fbm(nx * 20 + seed, ny * 20, 4, 2, 0.4);
          bump = 130 + base * 30 + dune * 55 + fine * 20;
          t1 = base * 0.3 + dune * 0.5 + fine * 0.15;
          t2 = (1 - dune) * 0.3;
          break;
        }
        case "pluto": {
          const base = fbm(nx * 6 + seed, ny * 6, 6);
          const plains = smoothNoise(nx * 2.5 + seed, ny * 2.5);
          const fine = fbm(nx * 25, ny * 25 + seed, 4, 2, 0.4);
          const isPlain = plains > 0.52;
          bump = isPlain
            ? 200 + fine * 20
            : 150 + base * 65 + fine * 20;
          t1 = isPlain ? 0.7 + fine * 0.15 : base * 0.5 + fine * 0.15;
          t2 = isPlain ? 0 : base * 0.2;
          break;
        }
        case "jupiter": {
          const bandPos = ny * 12 + Math.sin(nx * 5 + seed) * 0.9;
          const band = Math.sin(bandPos) * 0.5 + 0.5;
          const turb = fbm(nx * 10 + seed, ny * 10, 5, 2.3, 0.45);
          const fine = fbm(nx * 25, ny * 25 + seed, 4, 2, 0.45);
          bump = 110 + band * 55 + turb * 30 + fine * 20;
          t1 = band * 0.65 + turb * 0.2 + fine * 0.1;
          t2 = (1 - band) * turb * 0.4;
          break;
        }
        default: {
          const terrain = fbm(nx * 8 + seed, ny * 8, 6);
          const detail = fbm(nx * 18, ny * 18 + seed, 5, 2, 0.45);
          const fine = fbm(nx * 40 + seed, ny * 40, 3, 2, 0.4);
          bump = 120 + terrain * 80 + detail * 30 + fine * 15;
          t1 = terrain * 0.55 + detail * 0.25 + fine * 0.15;
          t2 = Math.max(0, 0.5 - terrain) * 0.3 + fine * 0.1;
        }
      }

      bumpData[py * size + px] = Math.max(0, Math.min(255, Math.round(bump)));

      const s1 = Math.max(0, Math.min(1, t1));
      const s2 = Math.max(0, Math.min(1, t2));
      tmp.copy(colA).lerp(colB, s1).lerp(colC, s2);

      const idx = (py * size + px) * 4;
      colorData[idx]     = Math.round(tmp.r * 255);
      colorData[idx + 1] = Math.round(tmp.g * 255);
      colorData[idx + 2] = Math.round(tmp.b * 255);
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
  const { bumpMap, colorMap } = useMemo(
    () => generateTerrainTextures(planetId, surfaceColor),
    [planetId, surfaceColor],
  );

  const geometry = useMemo(
    () => createCurvedPlaneGeometry(PLANE_SIZE, PLANE_SEGMENTS, PLANET_RADIUS),
    [],
  );

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={"#ffffff"}
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
