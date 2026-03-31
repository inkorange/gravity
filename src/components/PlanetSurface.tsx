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

// Per-planet material + color palette (4-5 colors each for rich variation)
const PLANET_PALETTES: Record<string, {
  roughness: number;
  metalness: number;
  bumpScale: number;
  emissiveColor?: string;
  emissiveIntensity?: number;
  colors: string[]; // [base, secondary, tertiary, accent, speckle]
}> = {
  earth: {
    roughness: 0.85, metalness: 0.05, bumpScale: 0.5,
    colors: ["#2d6e2d", "#4a9a3a", "#8b6d3f", "#5c8a2a", "#3a5520"],
  },
  moon: {
    roughness: 0.95, metalness: 0.0, bumpScale: 1.2,
    colors: ["#8a8a8a", "#a0a0a0", "#606060", "#b0a898", "#484848"],
  },
  mars: {
    roughness: 0.9, metalness: 0.02, bumpScale: 0.9,
    colors: ["#c1440e", "#d4713a", "#7a2800", "#e8a070", "#5c1800"],
  },
  jupiter: {
    roughness: 0.7, metalness: 0.1, bumpScale: 0.2,
    colors: ["#c49a6c", "#d4a050", "#8a5020", "#e8c890", "#6a4018"],
  },
  sun: {
    roughness: 0.3, metalness: 0.2, bumpScale: 0.6,
    emissiveColor: "#ff4400", emissiveIntensity: 0.6,
    colors: ["#ff6600", "#ffaa22", "#cc2200", "#ffdd44", "#881100"],
  },
  pluto: {
    roughness: 0.8, metalness: 0.05, bumpScale: 0.7,
    colors: ["#d4c5a9", "#e0d4c0", "#907858", "#c8b898", "#786040"],
  },
  europa: {
    roughness: 0.4, metalness: 0.15, bumpScale: 0.5,
    colors: ["#b8d4d4", "#d0e8f0", "#607080", "#8ab0c8", "#405060"],
  },
  titan: {
    roughness: 0.85, metalness: 0.0, bumpScale: 0.6,
    colors: ["#a07830", "#c09030", "#604818", "#d4a848", "#483010"],
  },
};

// ─── Crater configuration per planet ────────────────────────
interface CraterLayer {
  count: number;
  minR: number;
  maxR: number;
  depthMul: number;    // bump depression strength
  colorMul: number;    // color darkening strength
  rimMul: number;      // rim elevation strength
  rimColor: number;    // rim brightening
  roughAdd: number;    // roughness added inside crater
  seedOffset: number;  // unique offset per layer
}

const PLANET_CRATERS: Record<string, CraterLayer[]> = {
  moon: [
    { count: 6, minR: 40, maxR: 80, depthMul: 80, colorMul: 0.25, rimMul: 35, rimColor: 0.1, roughAdd: 0.06, seedOffset: 500 },
    { count: 20, minR: 14, maxR: 35, depthMul: 100, colorMul: 0.3, rimMul: 40, rimColor: 0.1, roughAdd: 0.1, seedOffset: 1500 },
    { count: 50, minR: 5, maxR: 14, depthMul: 55, colorMul: 0.2, rimMul: 20, rimColor: 0.07, roughAdd: 0.05, seedOffset: 2500 },
    { count: 80, minR: 2, maxR: 6, depthMul: 28, colorMul: 0.1, rimMul: 10, rimColor: 0.04, roughAdd: 0.02, seedOffset: 3500 },
  ],
  mars: [
    { count: 4, minR: 40, maxR: 75, depthMul: 65, colorMul: 0.18, rimMul: 28, rimColor: 0.07, roughAdd: 0.05, seedOffset: 600 },
    { count: 15, minR: 14, maxR: 30, depthMul: 80, colorMul: 0.22, rimMul: 32, rimColor: 0.08, roughAdd: 0.08, seedOffset: 1600 },
    { count: 40, minR: 5, maxR: 14, depthMul: 35, colorMul: 0.12, rimMul: 12, rimColor: 0.04, roughAdd: 0.03, seedOffset: 2600 },
    { count: 60, minR: 2, maxR: 6, depthMul: 18, colorMul: 0.06, rimMul: 6, rimColor: 0.02, roughAdd: 0.01, seedOffset: 3600 },
  ],
  europa: [
    { count: 3, minR: 25, maxR: 50, depthMul: 40, colorMul: 0.12, rimMul: 18, rimColor: 0.06, roughAdd: 0.04, seedOffset: 650 },
    { count: 12, minR: 8, maxR: 20, depthMul: 55, colorMul: 0.14, rimMul: 22, rimColor: 0.07, roughAdd: 0.06, seedOffset: 1650 },
    { count: 30, minR: 3, maxR: 9, depthMul: 28, colorMul: 0.09, rimMul: 10, rimColor: 0.03, roughAdd: 0.02, seedOffset: 2650 },
  ],
  titan: [
    { count: 3, minR: 30, maxR: 60, depthMul: 45, colorMul: 0.14, rimMul: 20, rimColor: 0.06, roughAdd: 0.04, seedOffset: 900 },
    { count: 12, minR: 10, maxR: 22, depthMul: 58, colorMul: 0.16, rimMul: 24, rimColor: 0.07, roughAdd: 0.06, seedOffset: 1900 },
    { count: 30, minR: 3, maxR: 9, depthMul: 25, colorMul: 0.09, rimMul: 10, rimColor: 0.03, roughAdd: 0.02, seedOffset: 2900 },
  ],
  pluto: [
    { count: 3, minR: 30, maxR: 55, depthMul: 55, colorMul: 0.17, rimMul: 25, rimColor: 0.08, roughAdd: 0.05, seedOffset: 700 },
    { count: 12, minR: 10, maxR: 22, depthMul: 75, colorMul: 0.22, rimMul: 30, rimColor: 0.09, roughAdd: 0.08, seedOffset: 1700 },
    { count: 30, minR: 3, maxR: 9, depthMul: 38, colorMul: 0.13, rimMul: 14, rimColor: 0.05, roughAdd: 0.03, seedOffset: 2700 },
  ],
  jupiter: [],
  earth: [],
  sun: [],
};

// Pre-computed crater with position, radius, and parent layer info
interface PreCrater {
  cx: number; cy: number; cr: number; cr2: number;
  depthMul: number; colorMul: number; rimMul: number;
  rimColor: number; roughAdd: number;
}

// Spatial grid for O(1) crater lookups per pixel
interface CraterGrid {
  cells: PreCrater[][];
  cellSize: number;
  cols: number;
  rows: number;
}

function buildCraterGrid(layers: CraterLayer[], size: number, seed: number): CraterGrid {
  // Find max crater radius to set cell size
  let maxR = 0;
  for (const layer of layers) maxR = Math.max(maxR, layer.maxR);
  const cellSize = Math.max(maxR * 2, 16);
  const cols = Math.ceil(size / cellSize);
  const rows = Math.ceil(size / cellSize);
  const cells: PreCrater[][] = new Array(cols * rows);
  for (let i = 0; i < cells.length; i++) cells[i] = [];

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const so = layer.seedOffset + li * 317;
    for (let c = 0; c < layer.count; c++) {
      // Bias crater placement toward center (visible area is ~15% around center)
      // Use a gaussian-like distribution: average two uniform randoms
      const u1x = craterHash(c, so + seed);
      const u2x = craterHash(c + 150000, so + seed);
      const u1y = craterHash(c + 50000, so + seed);
      const u2y = craterHash(c + 200000, so + seed);
      const cx = ((u1x + u2x) / 2) * size;
      const cy = ((u1y + u2y) / 2) * size;
      const cr = layer.minR + craterHash(c + 100000, so + seed) * (layer.maxR - layer.minR);
      const crater: PreCrater = {
        cx, cy, cr, cr2: cr * cr,
        depthMul: layer.depthMul, colorMul: layer.colorMul,
        rimMul: layer.rimMul, rimColor: layer.rimColor, roughAdd: layer.roughAdd,
      };
      // Insert into all grid cells the crater could overlap
      const minCol = Math.max(0, Math.floor((cx - cr) / cellSize));
      const maxCol = Math.min(cols - 1, Math.floor((cx + cr) / cellSize));
      const minRow = Math.max(0, Math.floor((cy - cr) / cellSize));
      const maxRow = Math.min(rows - 1, Math.floor((cy + cr) / cellSize));
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          cells[row * cols + col].push(crater);
        }
      }
    }
  }
  return { cells, cellSize, cols, rows };
}

function applyCratersGrid(
  grid: CraterGrid,
  px: number, py: number,
  out: { bump: number; colorT: number; roughVar: number },
) {
  const col = Math.floor(px / grid.cellSize);
  const row = Math.floor(py / grid.cellSize);
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return;
  const bucket = grid.cells[row * grid.cols + col];
  for (let i = 0; i < bucket.length; i++) {
    const cr = bucket[i];
    const dx = px - cr.cx; const dy = py - cr.cy;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < cr.cr2) {
      const dist = Math.sqrt(dist2);
      const r = dist / cr.cr;
      if (r < 0.65) {
        const t = 1 - r / 0.65;
        out.bump -= t * cr.depthMul;
        out.colorT -= t * cr.colorMul;
        out.roughVar += cr.roughAdd;
      } else if (r < 0.85) {
        const t = 1 - Math.abs(r - 0.75) / 0.1;
        out.bump += t * cr.rimMul;
        out.colorT += cr.rimColor;
      }
    }
  }
}

// ─── Noise primitives ───────────────────────────────────────

// High-quality hash for crater placement — returns uniform 0..1
function craterHash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0x517cc1b7, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

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

function fbm(x: number, y: number, octaves: number, lac: number = 2.0, gain: number = 0.5): number {
  let v = 0, a = 1, f = 1, m = 0;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * f, y * f) * a;
    m += a; a *= gain; f *= lac;
  }
  return v / m;
}

function ridgeFbm(x: number, y: number, octaves: number): number {
  let v = 0, a = 1, f = 1, m = 0, prev = 1;
  for (let i = 0; i < octaves; i++) {
    let n = Math.abs(smoothNoise(x * f, y * f) * 2 - 1);
    n = (1 - n); n *= n; n *= prev; prev = n;
    v += n * a; m += a; a *= 0.5; f *= 2.1;
  }
  return v / m;
}

/** Domain warping — uses noise to distort input coordinates for organic patterns */
function warpedFbm(x: number, y: number, octaves: number, warpStrength: number = 1.5, seed: number = 0): number {
  const qx = fbm(x + seed, y, 4);
  const qy = fbm(x, y + seed + 5.2, 4);
  const rx = fbm(x + qx * warpStrength + 1.7, y + qy * warpStrength + 9.2, 4);
  const ry = fbm(x + qx * warpStrength + 8.3, y + qy * warpStrength + 2.8, 4);
  return fbm(x + rx * warpStrength, y + ry * warpStrength, octaves);
}

/** Hash-based speckle — random grain at pixel level */
function speckle(x: number, y: number, intensity: number): number {
  return (hash(x * 1000 + 0.5, y * 1000 + 0.5) - 0.5) * intensity;
}

// ─── Curved plane geometry ──────────────────────────────────

function createCurvedPlaneGeometry(size: number, segments: number, radius: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const distSq = x * x + z * z;
    const y = distSq < radius * radius
      ? radius - Math.sqrt(radius * radius - distSq)
      : radius;
    pos.setY(i, -y);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ─── Texture generation ─────────────────────────────────────

function blendPalette(colors: THREE.Color[], t: number, out: THREE.Color): THREE.Color {
  const n = colors.length - 1;
  const idx = Math.max(0, Math.min(n, t * n));
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, n);
  const frac = idx - lo;
  return out.copy(colors[lo]).lerp(colors[hi], frac);
}

function generateTerrainTextures(
  planetId: string,
  surfaceColor: string,
  size: number = TEX_SIZE,
): { colorMap: THREE.DataTexture; roughnessMap: THREE.DataTexture; normalMap: THREE.DataTexture } {
  const bumpData = new Uint8Array(size * size);
  const colorData = new Uint8Array(size * size * 4);
  const roughData = new Uint8Array(size * size);

  const pal = PLANET_PALETTES[planetId] ?? PLANET_PALETTES.earth;
  const palette = pal.colors.map(c => new THREE.Color(c));
  const tmp = new THREE.Color();

  const seed = planetId.charCodeAt(0) * 137 + (planetId.charCodeAt(1) ?? 0) * 31;

  // Build spatial grid for craters once before pixel loop
  const craterLayers = PLANET_CRATERS[planetId] ?? PLANET_CRATERS.earth;
  const craterGrid = craterLayers.length > 0 ? buildCraterGrid(craterLayers, size, seed) : null;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size;
      const ny = py / size;

      let bump: number;
      let colorT: number;     // 0‥1 index into palette
      let roughVar: number;   // roughness variation (-0.2 to 0.2)
      const grain = speckle(nx, ny, 0.08);

      switch (planetId) {
        case "moon": {
          const warped = warpedFbm(nx * 8, ny * 8, 6, 1.2, seed);
          const fine = fbm(nx * 35 + seed, ny * 35, 4, 2.2, 0.45);
          const detail = fbm(nx * 60, ny * 60 + seed, 3, 2, 0.4);
          bump = warped * 160 + fine * 40 + detail * 20 + 40;
          colorT = warped * 0.5 + fine * 0.25 + detail * 0.1 + grain;
          roughVar = fine * 0.1;
          if (craterGrid) { const _o = { bump, colorT, roughVar }; applyCratersGrid(craterGrid, px, py, _o); bump = _o.bump; colorT = _o.colorT; roughVar = _o.roughVar; }
          break;
        }
        case "mars": {
          const warped = warpedFbm(nx * 6, ny * 6, 6, 1.8, seed);
          const ridge = ridgeFbm(nx * 8 + seed, ny * 8, 5);
          const fine = fbm(nx * 28, ny * 28 + seed, 5, 2, 0.45);
          const detail = fbm(nx * 55 + seed, ny * 55, 3, 2, 0.4);
          bump = warped * 80 + ridge * 70 + fine * 30 + detail * 15 + 50;
          colorT = warped * 0.35 + ridge * 0.25 + fine * 0.2 + detail * 0.1 + grain;
          roughVar = ridge * 0.1 - fine * 0.05;
          // Dried channels
          const chan = Math.abs(Math.sin(nx * 5 + warpedFbm(nx * 2, ny * 2, 3, 2, seed + 50) * 6));
          if (chan < 0.04) {
            const d = 1 - chan / 0.04;
            bump -= d * 65;
            colorT = d * 0.85 + (1 - d) * colorT;
            roughVar += d * 0.15;
          }
          if (craterGrid) { const _o = { bump, colorT, roughVar }; applyCratersGrid(craterGrid, px, py, _o); bump = _o.bump; colorT = _o.colorT; roughVar = _o.roughVar; }
          break;
        }
        case "europa": {
          const ice = warpedFbm(nx * 4, ny * 4, 5, 0.8, seed);
          const fine = fbm(nx * 30 + seed, ny * 30, 5, 2, 0.5);
          const detail = fbm(nx * 60, ny * 60 + seed, 3, 2, 0.4);
          bump = 185 + ice * 30 + fine * 15 + detail * 8;
          colorT = ice * 0.35 + fine * 0.15 + 0.25 + grain;
          roughVar = -ice * 0.15 + fine * 0.05;
          // Major cracks (domain-warped)
          const cWarp = warpedFbm(nx * 3, ny * 3, 3, 2, seed + 20);
          const c1 = Math.sin(nx * 18 + cWarp * 8) + Math.cos(ny * 14 - cWarp * 6);
          if (Math.abs(c1) < 0.16) {
            const d = 1 - Math.abs(c1) / 0.16;
            bump -= d * d * 120;
            colorT = d * 0.9 + (1 - d) * colorT;
            roughVar += d * 0.2;
          }
          // Fine cracks
          const c2Warp = fbm(nx * 5, ny * 5 + seed, 3);
          const c2 = Math.sin(nx * 35 + c2Warp * 4 + ny * 12) + Math.cos(ny * 28 - nx * 18 + c2Warp * 3);
          if (Math.abs(c2) < 0.1) {
            const d = 1 - Math.abs(c2) / 0.1;
            bump -= d * 45;
            colorT += d * 0.25;
            roughVar += d * 0.1;
          }
          if (craterGrid) { const _o = { bump, colorT, roughVar }; applyCratersGrid(craterGrid, px, py, _o); bump = _o.bump; colorT = _o.colorT; roughVar = _o.roughVar; }
          break;
        }
        case "sun": {
          const w1 = warpedFbm(nx * 5, ny * 5, 7, 2.5, seed);
          const w2 = warpedFbm(nx * 10 + 30, ny * 10, 5, 2, seed + 80);
          const cell = Math.sin(w1 * 12) * Math.cos(w2 * 9);
          const fine = fbm(nx * 22 + seed, ny * 22, 5, 2, 0.4);
          const detail = fbm(nx * 50, ny * 50 + seed, 3, 2, 0.4);
          bump = 80 + cell * 55 + w1 * 45 + fine * 20 + detail * 12;
          colorT = w1 * 0.3 + Math.abs(cell) * 0.3 + fine * 0.15 + 0.15 + grain;
          roughVar = cell * 0.15;
          break;
        }
        case "titan": {
          const warped = warpedFbm(nx * 3.5, ny * 3.5, 5, 1.5, seed);
          const dune = Math.sin(nx * 22 + warped * 8) * 0.5 + 0.5;
          const fine = fbm(nx * 18 + seed, ny * 18, 5, 2, 0.4);
          const detail = fbm(nx * 45, ny * 45 + seed, 3, 2, 0.4);
          bump = 125 + warped * 25 + dune * 55 + fine * 18 + detail * 10;
          colorT = warped * 0.2 + dune * 0.4 + fine * 0.15 + detail * 0.08 + grain;
          roughVar = dune * 0.1 - warped * 0.05;
          if (craterGrid) { const _o = { bump, colorT, roughVar }; applyCratersGrid(craterGrid, px, py, _o); bump = _o.bump; colorT = _o.colorT; roughVar = _o.roughVar; }
          break;
        }
        case "pluto": {
          const warped = warpedFbm(nx * 5, ny * 5, 6, 1.3, seed);
          const plains = smoothNoise(nx * 2.5 + seed, ny * 2.5);
          const fine = fbm(nx * 22 + seed, ny * 22, 5, 2, 0.4);
          const detail = fbm(nx * 50, ny * 50 + seed, 3, 2, 0.4);
          const isPlain = plains > 0.5;
          bump = isPlain
            ? 195 + fine * 18 + detail * 8
            : 140 + warped * 65 + fine * 18 + detail * 10;
          colorT = isPlain
            ? 0.6 + fine * 0.12 + detail * 0.06 + grain
            : warped * 0.45 + fine * 0.12 + detail * 0.06 + grain;
          roughVar = isPlain ? -0.1 : warped * 0.12;
          if (craterGrid) { const _o = { bump, colorT, roughVar }; applyCratersGrid(craterGrid, px, py, _o); bump = _o.bump; colorT = _o.colorT; roughVar = _o.roughVar; }
          break;
        }
        case "jupiter": {
          const warp = warpedFbm(nx * 4, ny * 4, 4, 1.5, seed);
          const bandPos = ny * 14 + warp * 3 + Math.sin(nx * 6 + seed) * 0.8;
          const band = Math.sin(bandPos) * 0.5 + 0.5;
          const turb = warpedFbm(nx * 8, ny * 8, 5, 1.8, seed + 40);
          const fine = fbm(nx * 22 + seed, ny * 22, 5, 2, 0.45);
          const detail = fbm(nx * 50, ny * 50 + seed, 3, 2, 0.4);
          bump = 105 + band * 55 + turb * 28 + fine * 18 + detail * 10;
          colorT = band * 0.5 + turb * 0.2 + fine * 0.1 + detail * 0.05 + grain;
          roughVar = (1 - band) * 0.1 + turb * 0.05;
          if (craterGrid) { const _o = { bump, colorT, roughVar }; applyCratersGrid(craterGrid, px, py, _o); bump = _o.bump; colorT = _o.colorT; roughVar = _o.roughVar; }
          break;
        }
        default: {
          // Earth
          const warped = warpedFbm(nx * 6, ny * 6, 6, 1.6, seed);
          const detail = warpedFbm(nx * 14, ny * 14, 5, 1.4, seed + 30);
          const fine = fbm(nx * 35 + seed, ny * 35, 4, 2, 0.45);
          const grain2 = fbm(nx * 60, ny * 60 + seed, 3, 2, 0.4);
          bump = 110 + warped * 80 + detail * 30 + fine * 18 + grain2 * 10;
          colorT = warped * 0.4 + detail * 0.25 + fine * 0.15 + grain2 * 0.08 + grain;
          roughVar = detail * 0.1 - fine * 0.05;
          if (craterGrid) { const _o = { bump, colorT, roughVar }; applyCratersGrid(craterGrid, px, py, _o); bump = _o.bump; colorT = _o.colorT; roughVar = _o.roughVar; }
        }
      }

      // Clamp and write bump
      bumpData[py * size + px] = Math.max(0, Math.min(255, Math.round(bump)));

      // Map colorT through the 5-color palette
      const ct = Math.max(0, Math.min(1, colorT));
      blendPalette(palette, ct, tmp);

      // Add per-pixel micro-variation to break uniformity
      const micro = hash(px + seed * 3, py + seed * 7) * 0.06 - 0.03;
      tmp.r = Math.max(0, Math.min(1, tmp.r + micro));
      tmp.g = Math.max(0, Math.min(1, tmp.g + micro * 0.8));
      tmp.b = Math.max(0, Math.min(1, tmp.b + micro * 0.6));

      const idx = (py * size + px) * 4;
      colorData[idx]     = Math.round(tmp.r * 255);
      colorData[idx + 1] = Math.round(tmp.g * 255);
      colorData[idx + 2] = Math.round(tmp.b * 255);
      colorData[idx + 3] = 255;

      // Roughness map: base roughness ± variation
      const rv = Math.max(0, Math.min(1, pal.roughness + roughVar));
      roughData[py * size + px] = Math.round(rv * 255);
    }
  }

  const colorMap = new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.magFilter = THREE.LinearFilter;
  colorMap.minFilter = THREE.LinearMipmapLinearFilter;
  colorMap.generateMipmaps = true;
  colorMap.needsUpdate = true;

  const roughnessMap = new THREE.DataTexture(roughData, size, size, THREE.RedFormat);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.magFilter = THREE.LinearFilter;
  roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
  roughnessMap.generateMipmaps = true;
  roughnessMap.needsUpdate = true;

  // Generate normal map from height data using Sobel filter
  const normalData = new Uint8Array(size * size * 4);
  const normalStrength = pal.bumpScale * 3;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Sample 3x3 neighborhood (with wrapping)
      const tl = bumpData[((py - 1 + size) % size) * size + ((px - 1 + size) % size)] / 255;
      const t  = bumpData[((py - 1 + size) % size) * size + px] / 255;
      const tr = bumpData[((py - 1 + size) % size) * size + ((px + 1) % size)] / 255;
      const l  = bumpData[py * size + ((px - 1 + size) % size)] / 255;
      const r  = bumpData[py * size + ((px + 1) % size)] / 255;
      const bl = bumpData[((py + 1) % size) * size + ((px - 1 + size) % size)] / 255;
      const b  = bumpData[((py + 1) % size) * size + px] / 255;
      const br = bumpData[((py + 1) % size) * size + ((px + 1) % size)] / 255;

      // Sobel operator
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Normal vector
      let nx2 = -dx * normalStrength;
      let ny2 = -dy * normalStrength;
      let nz = 1;
      const len = Math.sqrt(nx2 * nx2 + ny2 * ny2 + nz * nz);
      nx2 /= len; ny2 /= len; nz /= len;

      const idx = (py * size + px) * 4;
      normalData[idx]     = Math.round((nx2 * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round((ny2 * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;
    }
  }

  const normalMap = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.magFilter = THREE.LinearFilter;
  normalMap.minFilter = THREE.LinearMipmapLinearFilter;
  normalMap.generateMipmaps = true;
  normalMap.needsUpdate = true;

  return { colorMap, roughnessMap, normalMap };
}

export function PlanetSurface({ surfaceColor, skyColor, planetId }: PlanetSurfaceProps) {
  const pal = PLANET_PALETTES[planetId] ?? PLANET_PALETTES.earth;
  const { colorMap, roughnessMap, normalMap } = useMemo(
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
        roughnessMap={roughnessMap}
        roughness={1}
        metalness={pal.metalness}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(1, 1)}
        emissive={pal.emissiveColor ?? "#000000"}
        emissiveIntensity={pal.emissiveIntensity ?? 0}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
