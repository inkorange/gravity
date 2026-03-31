"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface AmbientParticlesProps {
  planetId: string;
}

interface ParticleConfig {
  count: number;
  color: string;
  size: number;
  speed: number;
  spread: number;
  opacity: number;
  drift: "horizontal" | "rise" | "swirl";
}

const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
  mars: {
    count: 80,
    color: "#d4926a",
    size: 0.06,
    speed: 0.3,
    spread: 12,
    opacity: 0.5,
    drift: "horizontal",
  },
  sun: {
    count: 60,
    color: "#ff8844",
    size: 0.08,
    speed: 0.6,
    spread: 10,
    opacity: 0.7,
    drift: "rise",
  },
  europa: {
    count: 50,
    color: "#c0e8ff",
    size: 0.04,
    speed: 0.15,
    spread: 12,
    opacity: 0.6,
    drift: "swirl",
  },
  pluto: {
    count: 30,
    color: "#d0e8ff",
    size: 0.03,
    speed: 0.08,
    spread: 12,
    opacity: 0.4,
    drift: "swirl",
  },
  titan: {
    count: 60,
    color: "#cc9944",
    size: 0.05,
    speed: 0.2,
    spread: 12,
    opacity: 0.4,
    drift: "horizontal",
  },
  jupiter: {
    count: 40,
    color: "#e0b070",
    size: 0.05,
    speed: 0.4,
    spread: 12,
    opacity: 0.3,
    drift: "horizontal",
  },
};

export function AmbientParticles({ planetId }: AmbientParticlesProps) {
  const config = PARTICLE_CONFIGS[planetId];
  if (!config) return null;

  return <ParticleSystem config={config} />;
}

function ParticleSystem({ config }: { config: ParticleConfig }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(config.count * 3);
    const vel = new Float32Array(config.count * 3);

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * config.spread;
      pos[i3 + 1] = Math.random() * 8;
      pos[i3 + 2] = (Math.random() - 0.5) * config.spread;

      // Per-particle random velocity variation
      const speedVar = 0.5 + Math.random();
      switch (config.drift) {
        case "horizontal":
          vel[i3] = config.speed * speedVar;
          vel[i3 + 1] = (Math.random() - 0.3) * config.speed * 0.2;
          vel[i3 + 2] = (Math.random() - 0.5) * config.speed * 0.3;
          break;
        case "rise":
          vel[i3] = (Math.random() - 0.5) * config.speed * 0.3;
          vel[i3 + 1] = config.speed * speedVar;
          vel[i3 + 2] = (Math.random() - 0.5) * config.speed * 0.3;
          break;
        case "swirl":
          vel[i3] = Math.sin(i) * config.speed * speedVar;
          vel[i3 + 1] = config.speed * 0.3 * speedVar;
          vel[i3 + 2] = Math.cos(i) * config.speed * speedVar;
          break;
      }
    }

    return { positions: pos, velocities: vel };
  }, [config]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const pos = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const half = config.spread / 2;

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      arr[i3] += velocities[i3] * delta;
      arr[i3 + 1] += velocities[i3 + 1] * delta;
      arr[i3 + 2] += velocities[i3 + 2] * delta;

      // Wrap around
      if (arr[i3] > half) arr[i3] = -half;
      if (arr[i3] < -half) arr[i3] = half;
      if (arr[i3 + 1] > 10) arr[i3 + 1] = 0;
      if (arr[i3 + 1] < 0) arr[i3 + 1] = 10;
      if (arr[i3 + 2] > half) arr[i3 + 2] = -half;
      if (arr[i3 + 2] < -half) arr[i3 + 2] = half;
    }

    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={config.count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={config.color}
        size={config.size}
        transparent
        opacity={config.opacity}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
