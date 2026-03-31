"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { DropPhase } from "@/types";

interface ShockwaveRingProps {
  planetId: string;
  gravity: number;
  impactVelocity: number;
  objectMass: number;
  phase: DropPhase;
  landed: boolean;
}

// Per-planet shockwave color (tinted to surface material)
const WAVE_COLORS: Record<string, string> = {
  earth: "#a09060",
  moon: "#c0c0c0",
  mars: "#d08040",
  jupiter: "#d0a060",
  sun: "#ff8800",
  pluto: "#c0d0e0",
  europa: "#a0d0e0",
  titan: "#c09030",
};

export function ShockwaveRing({ planetId, gravity, impactVelocity, objectMass, phase, landed }: ShockwaveRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const state = useRef({
    active: false,
    triggered: false,
    elapsed: 0,
    maxRadius: 0,
    duration: 0,
  });

  const color = WAVE_COLORS[planetId] ?? "#ffffff";

  useFrame((_, delta) => {
    const ring = ringRef.current;
    if (!ring) return;

    const s = state.current;

    // Trigger on landing
    if (landed && impactVelocity > 0 && !s.triggered) {
      s.triggered = true;
      s.active = true;
      s.elapsed = 0;

      // Scale effect by impact energy (velocity × mass proxy)
      const energy = Math.min((impactVelocity * Math.sqrt(objectMass)) / 200, 1);
      s.maxRadius = 2 + energy * 8;
      s.duration = 0.4 + energy * 0.6;

      ring.scale.set(0.1, 0.1, 0.1);
      ring.visible = true;
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7;
      mat.color.set(color);
      return;
    }

    // Reset
    if (phase === "idle" || phase === "anticipation") {
      s.active = false;
      s.triggered = false;
      ring.visible = false;
      return;
    }

    if (!s.active) {
      ring.visible = false;
      return;
    }

    s.elapsed += delta;
    const t = s.elapsed / s.duration;

    if (t >= 1) {
      s.active = false;
      ring.visible = false;
      return;
    }

    // Expand with ease-out
    const eased = 1 - (1 - t) * (1 - t);
    const radius = eased * s.maxRadius;
    ring.scale.set(radius, radius, radius);

    // Fade out
    const mat = ring.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.6 * (1 - t * t);
  });

  return (
    <mesh
      ref={ringRef}
      position={[0, 0.05, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
    >
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
