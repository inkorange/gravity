"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface SkyDomeProps {
  skyColor: string;
  planetId: string;
}

// Horizon glow color — warmer/brighter than the sky to simulate atmospheric scattering
const HORIZON_COLORS: Record<string, string> = {
  earth: "#c8dff0",
  moon: "#1a1a28",
  mars: "#e0a070",
  jupiter: "#d4b878",
  sun: "#ff6622",
  pluto: "#1e1e30",
  europa: "#1a1a30",
  titan: "#d4a050",
};

/**
 * A large inverted hemisphere with a vertical gradient:
 * horizon color at the bottom edge, fading to sky color at the top.
 * Placed behind the planet surface to give atmospheric depth.
 */
export function SkyDome({ skyColor, planetId }: SkyDomeProps) {
  const horizonColor = HORIZON_COLORS[planetId] ?? skyColor;

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(90, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    // Assign vertex colors for gradient
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const sky = new THREE.Color(skyColor);
    const horizon = new THREE.Color(horizonColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // y ranges from 0 (equator/horizon) to 90 (zenith)
      // Normalize so 0 = horizon, 1 = zenith
      const t = Math.max(0, Math.min(1, y / 90));
      // Ease so the horizon glow is concentrated near the bottom
      const blend = Math.pow(t, 0.6);
      tmp.copy(horizon).lerp(sky, blend);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [skyColor, horizonColor]);

  return (
    <mesh geometry={geometry} scale={[1, 1, 1]}>
      <meshBasicMaterial
        vertexColors
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
      />
    </mesh>
  );
}
