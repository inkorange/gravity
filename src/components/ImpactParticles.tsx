"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { DropPhase } from "@/types";

interface ImpactParticlesProps {
  planetId: string;
  gravity: number;
  impactVelocity: number;
  phase: DropPhase;
  landed: boolean;
}

interface PlanetParticleConfig {
  count: number;
  color: string;
  secondaryColor: string;
  baseSize: number;
}

const IMPACT_CONFIGS: Record<string, PlanetParticleConfig> = {
  earth:   { count: 50, color: "#8b6d3f", secondaryColor: "#5a8a3a", baseSize: 0.15 },
  moon:    { count: 70, color: "#b0b0b0", secondaryColor: "#808080", baseSize: 0.12 },
  mars:    { count: 55, color: "#c05020", secondaryColor: "#d47040", baseSize: 0.14 },
  jupiter: { count: 40, color: "#d4a050", secondaryColor: "#c08030", baseSize: 0.12 },
  sun:     { count: 50, color: "#ff6600", secondaryColor: "#ffcc22", baseSize: 0.18 },
  pluto:   { count: 40, color: "#d0dce8", secondaryColor: "#a0b8d0", baseSize: 0.10 },
  europa:  { count: 50, color: "#c0dce8", secondaryColor: "#80b0d0", baseSize: 0.11 },
  titan:   { count: 45, color: "#b08030", secondaryColor: "#907020", baseSize: 0.12 },
};

const MAX_PARTICLES = 70;

export function ImpactParticles({ planetId, gravity, impactVelocity, phase, landed }: ImpactParticlesProps) {
  const config = IMPACT_CONFIGS[planetId] ?? IMPACT_CONFIGS.earth;
  const pointsRef = useRef<THREE.Points>(null);

  // Particle state managed entirely in refs for useFrame access
  const state = useRef({
    active: false,
    elapsed: 0,
    lifetime: 0,
    triggered: false, // has this landing been triggered?
    velocities: new Float32Array(MAX_PARTICLES * 3),
  });

  // Geometry buffers — stable references
  const buffers = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);

    // All particles start hidden below ground
    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3 + 1] = -50;
    }

    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const s = state.current;
    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = points.geometry.attributes.color as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;

    // ─── Trigger on landing ────────────────────────────
    if (landed && impactVelocity > 0 && !s.triggered) {
      s.triggered = true;
      s.active = true;
      s.elapsed = 0;

      const intensity = Math.min(impactVelocity / 25, 1);
      const count = Math.floor(config.count * (0.4 + intensity * 0.6));

      const c1 = new THREE.Color(config.color);
      const c2 = new THREE.Color(config.secondaryColor);
      const tmp = new THREE.Color();

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const i3 = i * 3;
        if (i < count) {
          // Spawn at ground level with slight random offset
          pos[i3]     = (Math.random() - 0.5) * 0.5;
          pos[i3 + 1] = 0.1;
          pos[i3 + 2] = (Math.random() - 0.5) * 0.5;

          // Radial burst — speed scales with impact
          const angle = Math.random() * Math.PI * 2;
          const radial = (2 + Math.random() * 6) * intensity;
          const up = (4 + Math.random() * 10) * intensity;

          s.velocities[i3]     = Math.cos(angle) * radial;
          s.velocities[i3 + 1] = up;
          s.velocities[i3 + 2] = Math.sin(angle) * radial;

          // Random color per particle
          const blend = Math.random();
          tmp.copy(c1).lerp(c2, blend);
          col[i3]     = tmp.r;
          col[i3 + 1] = tmp.g;
          col[i3 + 2] = tmp.b;
        } else {
          pos[i3 + 1] = -50;
          s.velocities[i3] = 0;
          s.velocities[i3 + 1] = 0;
          s.velocities[i3 + 2] = 0;
        }
      }

      s.lifetime = 2 + (1 / Math.max(gravity, 0.3)) * 2;

      colAttr.needsUpdate = true;
      posAttr.needsUpdate = true;
      return;
    }

    // ─── Reset on new drop ─────────────────────────────
    if (phase === "idle" || phase === "anticipation") {
      if (s.triggered || s.active) {
        s.active = false;
        s.triggered = false;
        s.elapsed = 0;
        for (let i = 0; i < MAX_PARTICLES; i++) {
          pos[i * 3 + 1] = -50;
        }
        posAttr.needsUpdate = true;
      }
      return;
    }

    // ─── Animate active particles ──────────────────────
    if (!s.active) return;

    s.elapsed += delta;
    if (s.elapsed > s.lifetime) {
      s.active = false;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        pos[i * 3 + 1] = -50;
      }
      posAttr.needsUpdate = true;
      return;
    }

    const vel = s.velocities;
    // Use scene-scaled gravity (matches SCENE_SCALE = 0.5 from DroppableObject)
    const grav = gravity * 0.5;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      if (pos[i3 + 1] < -5) continue;

      // Gravity
      vel[i3 + 1] -= grav * delta;

      // Position update
      pos[i3]     += vel[i3] * delta;
      pos[i3 + 1] += vel[i3 + 1] * delta;
      pos[i3 + 2] += vel[i3 + 2] * delta;

      // Ground bounce
      if (pos[i3 + 1] < 0 && vel[i3 + 1] < 0) {
        pos[i3 + 1] = 0;
        vel[i3 + 1] *= -0.15;
        vel[i3]     *= 0.4;
        vel[i3 + 2] *= 0.4;
        if (Math.abs(vel[i3 + 1]) < 0.05) {
          vel[i3 + 1] = 0;
        }
      }

      // Air drag
      vel[i3]     *= (1 - delta * 0.8);
      vel[i3 + 2] *= (1 - delta * 0.8);
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[buffers.positions, 3]}
          count={MAX_PARTICLES}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[buffers.colors, 3]}
          count={MAX_PARTICLES}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={config.baseSize}
        transparent
        opacity={0.9}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
