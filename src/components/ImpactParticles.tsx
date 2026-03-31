"use client";

import { useRef, useMemo, useEffect } from "react";
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

interface ParticleData {
  count: number;
  color: string;
  secondaryColor: string;
  size: number;
  type: "dust" | "rocks" | "chunks" | "embers" | "ice";
}

const IMPACT_CONFIGS: Record<string, ParticleData> = {
  earth: {
    count: 40,
    color: "#8b6d3f",
    secondaryColor: "#4a7a3a",
    size: 0.08,
    type: "rocks",
  },
  moon: {
    count: 60,
    color: "#aaaaaa",
    secondaryColor: "#888888",
    size: 0.05,
    type: "dust",
  },
  mars: {
    count: 50,
    color: "#c05020",
    secondaryColor: "#d47040",
    size: 0.07,
    type: "rocks",
  },
  jupiter: {
    count: 30,
    color: "#d4a050",
    secondaryColor: "#c08030",
    size: 0.06,
    type: "dust",
  },
  sun: {
    count: 45,
    color: "#ff6600",
    secondaryColor: "#ffaa22",
    size: 0.1,
    type: "embers",
  },
  pluto: {
    count: 35,
    color: "#d0dce8",
    secondaryColor: "#a0b0c0",
    size: 0.04,
    type: "ice",
  },
  europa: {
    count: 45,
    color: "#c0dce8",
    secondaryColor: "#8ab0c8",
    size: 0.05,
    type: "ice",
  },
  titan: {
    count: 35,
    color: "#b08030",
    secondaryColor: "#806020",
    size: 0.06,
    type: "dust",
  },
};

const MAX_PARTICLES = 60;

export function ImpactParticles({ planetId, gravity, impactVelocity, phase, landed }: ImpactParticlesProps) {
  const config = IMPACT_CONFIGS[planetId] ?? IMPACT_CONFIGS.earth;
  const pointsRef = useRef<THREE.Points>(null);
  const activeRef = useRef(false);
  const elapsedRef = useRef(0);

  // Velocity and position arrays for each particle
  const particleState = useMemo(() => ({
    velocities: new Float32Array(MAX_PARTICLES * 3),
    active: false,
    lifetime: 0,
  }), []);

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3);
    const col = new Float32Array(MAX_PARTICLES * 3);
    const sz = new Float32Array(MAX_PARTICLES);

    const c1 = new THREE.Color(config.color);
    const c2 = new THREE.Color(config.secondaryColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < MAX_PARTICLES; i++) {
      // Start all particles at origin (hidden)
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -10; // below ground = hidden
      pos[i * 3 + 2] = 0;

      // Random color blend per particle
      const blend = Math.random();
      tmp.copy(c1).lerp(c2, blend);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;

      // Varied sizes
      sz[i] = config.size * (0.5 + Math.random());
    }

    return { positions: pos, colors: col, sizes: sz };
  }, [config]);

  // Trigger particles on impact
  useEffect(() => {
    if (landed && impactVelocity > 0 && !activeRef.current) {
      activeRef.current = true;
      elapsedRef.current = 0;

      // Scale particle count and speed by impact velocity
      const intensity = Math.min(impactVelocity / 30, 1); // normalize
      const count = Math.floor(config.count * (0.3 + intensity * 0.7));

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const i3 = i * 3;
        if (i < count) {
          // Reset position to ground level
          positions[i3] = (Math.random() - 0.5) * 0.3;
          positions[i3 + 1] = 0.05;
          positions[i3 + 2] = (Math.random() - 0.5) * 0.3;

          // Radial burst velocity scaled by impact speed
          const angle = Math.random() * Math.PI * 2;
          const radialSpeed = (1 + Math.random() * 3) * intensity;
          const upSpeed = (2 + Math.random() * 5) * intensity;

          particleState.velocities[i3] = Math.cos(angle) * radialSpeed;
          particleState.velocities[i3 + 1] = upSpeed;
          particleState.velocities[i3 + 2] = Math.sin(angle) * radialSpeed;
        } else {
          // Inactive particle
          positions[i3 + 1] = -10;
          particleState.velocities[i3] = 0;
          particleState.velocities[i3 + 1] = 0;
          particleState.velocities[i3 + 2] = 0;
        }
      }

      // Lifetime depends on gravity — low gravity = particles hang longer
      particleState.lifetime = 1.5 + (1 / Math.max(gravity, 0.5)) * 2;
    }
  }, [landed, impactVelocity, gravity, config.count, positions, particleState]);

  // Reset on new drop
  useEffect(() => {
    if (phase === "idle") {
      activeRef.current = false;
      elapsedRef.current = 0;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        positions[i * 3 + 1] = -10;
      }
    }
  }, [phase, positions]);

  useFrame((_, delta) => {
    if (!activeRef.current || !pointsRef.current) return;

    elapsedRef.current += delta;
    if (elapsedRef.current > particleState.lifetime) {
      activeRef.current = false;
      // Hide all particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        positions[i * 3 + 1] = -10;
      }
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      return;
    }

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const vel = particleState.velocities;
    const scaledGravity = gravity * 0.5; // scene-scaled gravity

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      if (arr[i3 + 1] < -5) continue; // skip inactive

      // Apply gravity to vertical velocity
      vel[i3 + 1] -= scaledGravity * delta;

      // Update position
      arr[i3] += vel[i3] * delta;
      arr[i3 + 1] += vel[i3 + 1] * delta;
      arr[i3 + 2] += vel[i3 + 2] * delta;

      // Ground collision — settle
      if (arr[i3 + 1] < 0 && vel[i3 + 1] < 0) {
        arr[i3 + 1] = 0;
        vel[i3 + 1] *= -0.2; // small bounce
        vel[i3] *= 0.5; // friction
        vel[i3 + 2] *= 0.5;

        // If very slow, kill particle
        if (Math.abs(vel[i3 + 1]) < 0.1) {
          vel[i3 + 1] = 0;
        }
      }

      // Drag
      vel[i3] *= (1 - delta * 0.5);
      vel[i3 + 2] *= (1 - delta * 0.5);
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={MAX_PARTICLES} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={MAX_PARTICLES} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={config.size}
        transparent
        opacity={0.85}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
