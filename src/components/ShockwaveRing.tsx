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

interface WaveConfig {
  color: string;
  dustSize: number;
  dustCount: number;
  upSpeedMin: number;
  upSpeedMax: number;
  outSpeedMin: number;
  outSpeedMax: number;
  drag: number;
}

const WAVE_CONFIGS: Record<string, WaveConfig> = {
  earth: {
    color: "#a09060", dustSize: 0.08, dustCount: 48,
    upSpeedMin: 1, upSpeedMax: 3, outSpeedMin: 0.5, outSpeedMax: 1.5, drag: 1.0,
  },
  moon: {
    color: "#c0c0c0", dustSize: 0.05, dustCount: 80,
    upSpeedMin: 0.5, upSpeedMax: 4, outSpeedMin: 0.3, outSpeedMax: 2.0, drag: 0.0,
  },
  mars: {
    color: "#d08040", dustSize: 0.06, dustCount: 60,
    upSpeedMin: 1, upSpeedMax: 3.5, outSpeedMin: 0.5, outSpeedMax: 1.8, drag: 0.3,
  },
  jupiter: {
    color: "#d0a060", dustSize: 0.14, dustCount: 40,
    upSpeedMin: 0.3, upSpeedMax: 1.5, outSpeedMin: 0.2, outSpeedMax: 0.8, drag: 2.5,
  },
  sun: {
    color: "#ff8800", dustSize: 0.12, dustCount: 50,
    upSpeedMin: 0.8, upSpeedMax: 3, outSpeedMin: 0.3, outSpeedMax: 1.2, drag: 1.5,
  },
  pluto: {
    color: "#c0d0e0", dustSize: 0.04, dustCount: 60,
    upSpeedMin: 0.5, upSpeedMax: 4, outSpeedMin: 0.3, outSpeedMax: 2.0, drag: 0.05,
  },
  europa: {
    color: "#a0d0e0", dustSize: 0.04, dustCount: 70,
    upSpeedMin: 0.5, upSpeedMax: 4.5, outSpeedMin: 0.4, outSpeedMax: 2.2, drag: 0.02,
  },
  titan: {
    color: "#c09030", dustSize: 0.11, dustCount: 45,
    upSpeedMin: 0.3, upSpeedMax: 1.5, outSpeedMin: 0.2, outSpeedMax: 0.8, drag: 2.0,
  },
};

const MAX_DUST = 80;

export function ShockwaveRing({ planetId, gravity, impactVelocity, objectMass, phase, landed }: ShockwaveRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Points>(null);

  const waveConfig = WAVE_CONFIGS[planetId] ?? WAVE_CONFIGS.earth;

  const state = useRef({
    active: false,
    triggered: false,
    elapsed: 0,
    maxRadius: 0,
    duration: 0,
    dustVelocities: new Float32Array(MAX_DUST * 3),
  });

  useFrame((_, delta) => {
    const ring = ringRef.current;
    const dust = dustRef.current;
    if (!ring || !dust) return;

    const s = state.current;
    const cfg = waveConfig;

    // Trigger on landing
    if (landed && impactVelocity > 0 && !s.triggered) {
      s.triggered = true;
      s.active = true;
      s.elapsed = 0;

      const force = Math.min((impactVelocity * Math.sqrt(objectMass)) / 300, 1);
      s.maxRadius = 0.3 + force * 1.2;
      s.duration = 0.15 + force * 0.15;

      // Ring
      ring.scale.set(0.1, 0.1, 0.1);
      ring.visible = true;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.6;
      (ring.material as THREE.MeshBasicMaterial).color.set(cfg.color);

      // Spawn dust along the shockwave ring
      const posAttr = dust.geometry.attributes.position as THREE.BufferAttribute;
      const pos = posAttr.array as Float32Array;
      const col = (dust.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
      const dustColor = new THREE.Color(cfg.color);

      for (let i = 0; i < MAX_DUST; i++) {
        const i3 = i * 3;

        if (i < cfg.dustCount) {
          const angle = (i / cfg.dustCount) * Math.PI * 2 + Math.random() * 0.4;
          const r = 0.15 + Math.random() * 0.35;

          pos[i3] = Math.cos(angle) * r;
          pos[i3 + 1] = 0.05;
          pos[i3 + 2] = Math.sin(angle) * r;

          // Per-planet velocity profile
          const outSpeed = (cfg.outSpeedMin + Math.random() * (cfg.outSpeedMax - cfg.outSpeedMin)) * force;
          const upSpeed = (cfg.upSpeedMin + Math.random() * (cfg.upSpeedMax - cfg.upSpeedMin)) * force;

          s.dustVelocities[i3] = Math.cos(angle) * outSpeed;
          s.dustVelocities[i3 + 1] = upSpeed;
          s.dustVelocities[i3 + 2] = Math.sin(angle) * outSpeed;

          // Color variation
          const brightness = 0.7 + Math.random() * 0.6;
          col[i3] = dustColor.r * brightness;
          col[i3 + 1] = dustColor.g * brightness;
          col[i3 + 2] = dustColor.b * brightness;
        } else {
          pos[i3 + 1] = -50;
          s.dustVelocities[i3] = 0;
          s.dustVelocities[i3 + 1] = 0;
          s.dustVelocities[i3 + 2] = 0;
        }
      }
      posAttr.needsUpdate = true;
      (dust.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      dust.visible = true;
      return;
    }

    // Reset
    if (phase === "idle" || phase === "anticipation") {
      s.active = false;
      s.triggered = false;
      ring.visible = false;
      dust.visible = false;
      return;
    }

    if (!s.active) {
      ring.visible = false;
      dust.visible = false;
      return;
    }

    s.elapsed += delta;
    const t = s.elapsed / s.duration;
    const dustLifetime = s.duration * 5;
    const dustT = s.elapsed / dustLifetime;

    if (dustT >= 1) {
      s.active = false;
      ring.visible = false;
      dust.visible = false;
      return;
    }

    // Ring: expand and fade
    if (t < 1) {
      const eased = 1 - (1 - t) * (1 - t);
      const radius = eased * s.maxRadius;
      ring.scale.set(radius, radius, radius);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t * t);
    } else {
      ring.visible = false;
    }

    // Dust: rise and fall under gravity with per-planet drag
    const posAttr = dust.geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const vel = s.dustVelocities;
    const grav = gravity * 0.4;
    const dragFactor = 1 - delta * cfg.drag;

    for (let i = 0; i < MAX_DUST; i++) {
      const i3 = i * 3;
      if (pos[i3 + 1] < -5) continue;

      vel[i3 + 1] -= grav * delta;

      // Per-planet drag
      vel[i3] *= dragFactor;
      vel[i3 + 2] *= dragFactor;

      pos[i3] += vel[i3] * delta;
      pos[i3 + 1] += vel[i3 + 1] * delta;
      pos[i3 + 2] += vel[i3 + 2] * delta;

      if (pos[i3 + 1] < 0) {
        pos[i3 + 1] = 0;
        vel[i3 + 1] = 0;
        vel[i3] *= 0.3;
        vel[i3 + 2] *= 0.3;
      }
    }
    posAttr.needsUpdate = true;
    (dust.material as THREE.PointsMaterial).opacity = Math.max(0, 0.8 * (1 - dustT));
  });

  // Pre-allocate buffers
  const dustPositions = useRef(new Float32Array(MAX_DUST * 3)).current;
  const dustColors = useRef(new Float32Array(MAX_DUST * 3)).current;

  return (
    <>
      <mesh
        ref={ringRef}
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial
          color={waveConfig.color}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <points ref={dustRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} count={MAX_DUST} />
          <bufferAttribute attach="attributes-color" args={[dustColors, 3]} count={MAX_DUST} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={waveConfig.dustSize}
          transparent
          opacity={0.8}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  );
}
