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
  colors: string[];        // multiple colors for variety
  baseSize: number;
  sizeVariance: number;    // how much size varies per particle
  // Velocity profiles
  radialMin: number;       // min outward speed multiplier
  radialMax: number;       // max outward speed multiplier
  upMin: number;           // min upward speed multiplier
  upMax: number;           // max upward speed multiplier
  spawnRadius: number;     // how spread out the spawn point is
  drag: number;            // air resistance (0 = vacuum, 1 = thick atmosphere)
  bounce: number;          // ground bounce restitution
  style: "rocky" | "dusty" | "gassy" | "icy" | "fiery";
}

// Each planet has a distinct particle personality
const IMPACT_CONFIGS: Record<string, PlanetParticleConfig> = {
  earth: {
    count: 120, baseSize: 0.12, sizeVariance: 0.08,
    colors: ["#8b6d3f", "#5a8a3a", "#6b5d2f", "#4a7a2a", "#9b7d4f"],
    radialMin: 2, radialMax: 7, upMin: 3, upMax: 9,
    spawnRadius: 0.4, drag: 1.2, bounce: 0.15,
    style: "rocky",
  },
  moon: {
    count: 200, baseSize: 0.07, sizeVariance: 0.05,
    colors: ["#b0b0b0", "#909090", "#c8c8c8", "#a0a0a0", "#d0d0d0", "#787878"],
    radialMin: 1, radialMax: 10, upMin: 2, upMax: 14,
    spawnRadius: 0.6, drag: 0.0, bounce: 0.0,
    style: "dusty",  // fine dust, no air resistance, floats high and wide
  },
  mars: {
    count: 150, baseSize: 0.09, sizeVariance: 0.06,
    colors: ["#c05020", "#d47040", "#b04010", "#e08050", "#a03000"],
    radialMin: 2, radialMax: 8, upMin: 4, upMax: 12,
    spawnRadius: 0.5, drag: 0.4, bounce: 0.1,
    style: "dusty",  // thin atmosphere, lots of red dust
  },
  jupiter: {
    count: 100, baseSize: 0.18, sizeVariance: 0.14,
    colors: ["#d4a050", "#c08030", "#e0b060", "#b07020", "#f0c870", "#aa6010"],
    radialMin: 0.5, radialMax: 3, upMin: 1, upMax: 4,
    spawnRadius: 0.8, drag: 3.0, bounce: 0.0,
    style: "gassy",  // thick atmosphere, slow billowing clouds
  },
  sun: {
    count: 140, baseSize: 0.16, sizeVariance: 0.12,
    colors: ["#ff6600", "#ffcc22", "#ff4400", "#ffaa00", "#ff8800", "#ffe040"],
    radialMin: 1, radialMax: 5, upMin: 3, upMax: 10,
    spawnRadius: 0.6, drag: 2.0, bounce: 0.0,
    style: "fiery",  // plasma eruptions, no bounce, glowing
  },
  pluto: {
    count: 110, baseSize: 0.06, sizeVariance: 0.04,
    colors: ["#d0dce8", "#a0b8d0", "#e0e8f0", "#b8c8d8", "#c0d0e0"],
    radialMin: 1.5, radialMax: 9, upMin: 2, upMax: 12,
    spawnRadius: 0.4, drag: 0.1, bounce: 0.05,
    style: "icy",  // fine ice crystals, very low gravity = float forever
  },
  europa: {
    count: 140, baseSize: 0.06, sizeVariance: 0.04,
    colors: ["#c0dce8", "#80b0d0", "#e0f0ff", "#90c0e0", "#a0d0f0", "#70a0c0"],
    radialMin: 1.5, radialMax: 9, upMin: 3, upMax: 13,
    spawnRadius: 0.5, drag: 0.05, bounce: 0.02,
    style: "icy",  // ice shards, nearly no atmosphere
  },
  titan: {
    count: 120, baseSize: 0.13, sizeVariance: 0.10,
    colors: ["#b08030", "#907020", "#c09040", "#806010", "#d0a050"],
    radialMin: 0.8, radialMax: 4, upMin: 2, upMax: 6,
    spawnRadius: 0.7, drag: 2.5, bounce: 0.0,
    style: "gassy",  // thick hazy atmosphere, slow-moving particles
  },
};

const MAX_PARTICLES = 200;

export function ImpactParticles({ planetId, gravity, impactVelocity, phase, landed }: ImpactParticlesProps) {
  const config = IMPACT_CONFIGS[planetId] ?? IMPACT_CONFIGS.earth;
  const pointsRef = useRef<THREE.Points>(null);

  const state = useRef({
    active: false,
    elapsed: 0,
    lifetime: 0,
    triggered: false,
    velocities: new Float32Array(MAX_PARTICLES * 3),
    sizes: new Float32Array(MAX_PARTICLES),
    style: "rocky" as PlanetParticleConfig["style"],
  });

  const buffers = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3 + 1] = -50;
      sizes[i] = 0.1;
    }

    return { positions, colors, sizes };
  }, []);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const s = state.current;
    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = points.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = points.geometry.attributes.size as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;
    const sizes = sizeAttr.array as Float32Array;

    // ─── Trigger on landing ────────────────────────────
    if (landed && impactVelocity > 0 && !s.triggered) {
      s.triggered = true;
      s.active = true;
      s.elapsed = 0;
      s.style = config.style;

      const intensity = Math.min(impactVelocity / 25, 1);
      const count = Math.floor(config.count * (0.4 + intensity * 0.6));

      const colorObjs = config.colors.map(c => new THREE.Color(c));
      const tmp = new THREE.Color();

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const i3 = i * 3;
        if (i < count) {
          // Spawn position — style-dependent spread
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnR = Math.random() * config.spawnRadius;
          pos[i3]     = Math.cos(spawnAngle) * spawnR;
          pos[i3 + 1] = 0.05 + Math.random() * 0.1;
          pos[i3 + 2] = Math.sin(spawnAngle) * spawnR;

          // Velocity — per-planet profile
          const angle = Math.random() * Math.PI * 2;
          const radial = (config.radialMin + Math.random() * (config.radialMax - config.radialMin)) * intensity;
          const up = (config.upMin + Math.random() * (config.upMax - config.upMin)) * intensity;

          s.velocities[i3]     = Math.cos(angle) * radial;
          s.velocities[i3 + 1] = up;
          s.velocities[i3 + 2] = Math.sin(angle) * radial;

          // For gassy/fiery: add random lateral drift
          if (config.style === "gassy" || config.style === "fiery") {
            s.velocities[i3]     += (Math.random() - 0.5) * 2;
            s.velocities[i3 + 2] += (Math.random() - 0.5) * 2;
          }

          // For dusty: some particles go nearly horizontal (wide dust cloud)
          if (config.style === "dusty" && Math.random() < 0.3) {
            s.velocities[i3 + 1] *= 0.3;
            s.velocities[i3]     *= 1.8;
            s.velocities[i3 + 2] *= 1.8;
          }

          // Size per particle
          sizes[i] = config.baseSize + (Math.random() - 0.3) * config.sizeVariance;

          // For gassy: some big billowy particles
          if (config.style === "gassy" && Math.random() < 0.2) {
            sizes[i] *= 2.5;
          }

          // Pick random color from palette
          const colorIdx = Math.floor(Math.random() * colorObjs.length);
          const colorIdx2 = Math.floor(Math.random() * colorObjs.length);
          const blend = Math.random();
          tmp.copy(colorObjs[colorIdx]).lerp(colorObjs[colorIdx2], blend);
          // Add per-particle brightness variation
          const brightness = 0.7 + Math.random() * 0.6;
          col[i3]     = tmp.r * brightness;
          col[i3 + 1] = tmp.g * brightness;
          col[i3 + 2] = tmp.b * brightness;
        } else {
          pos[i3 + 1] = -50;
          s.velocities[i3] = 0;
          s.velocities[i3 + 1] = 0;
          s.velocities[i3 + 2] = 0;
          sizes[i] = 0;
        }
      }

      // Lifetime depends on gravity — low gravity = particles linger much longer
      s.lifetime = 2.5 + (1 / Math.max(gravity, 0.3)) * 3;

      colAttr.needsUpdate = true;
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
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
    const grav = gravity * 0.5;
    const dragFactor = config.drag;
    const fadeStart = s.lifetime * 0.6;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      if (pos[i3 + 1] < -5) continue;

      // Gravity
      vel[i3 + 1] -= grav * delta;

      // Drag — style-dependent
      const drag = 1 - delta * dragFactor;
      vel[i3]     *= drag;
      vel[i3 + 1] *= (1 - delta * dragFactor * 0.3); // less vertical drag
      vel[i3 + 2] *= drag;

      // Gassy/fiery: add turbulent drift over time
      if (s.style === "gassy" || s.style === "fiery") {
        const t = s.elapsed * 3 + i;
        vel[i3]     += Math.sin(t * 1.3) * delta * 0.8;
        vel[i3 + 2] += Math.cos(t * 0.9) * delta * 0.8;
        // Gassy particles also rise slightly (buoyancy)
        if (s.style === "gassy") {
          vel[i3 + 1] += delta * 0.3;
        }
      }

      // Fiery: particles drift upward like embers
      if (s.style === "fiery") {
        vel[i3 + 1] += delta * 0.5;
      }

      // Position update
      pos[i3]     += vel[i3] * delta;
      pos[i3 + 1] += vel[i3 + 1] * delta;
      pos[i3 + 2] += vel[i3 + 2] * delta;

      // Ground interaction — style-dependent
      if (pos[i3 + 1] < 0 && vel[i3 + 1] < 0) {
        pos[i3 + 1] = 0;

        if (config.bounce > 0) {
          vel[i3 + 1] *= -config.bounce;
          vel[i3]     *= 0.4;
          vel[i3 + 2] *= 0.4;
          if (Math.abs(vel[i3 + 1]) < 0.05) {
            vel[i3 + 1] = 0;
          }
        } else {
          // No bounce — particle slides/settles (gassy, fiery)
          vel[i3 + 1] = 0;
          vel[i3]     *= 0.7;
          vel[i3 + 2] *= 0.7;
        }

        // Dusty: on ground contact, some particles puff back up slightly
        if (s.style === "dusty" && Math.random() < 0.15) {
          vel[i3 + 1] = 0.5 + Math.random() * 1.5;
        }
      }

      // Size fade for gassy/fiery — particles grow as they dissipate
      if (s.style === "gassy" || s.style === "fiery") {
        sizes[i] *= (1 + delta * 0.5);
      }
    }

    // Fade opacity over time
    const mat = points.material as THREE.ShaderMaterial | THREE.PointsMaterial;
    if (s.elapsed > fadeStart) {
      const fadeT = (s.elapsed - fadeStart) / (s.lifetime - fadeStart);
      (mat as THREE.PointsMaterial).opacity = 0.9 * (1 - fadeT);
    }

    posAttr.needsUpdate = true;
    if (s.style === "gassy" || s.style === "fiery") {
      sizeAttr.needsUpdate = true;
    }
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
        <bufferAttribute
          attach="attributes-size"
          args={[buffers.sizes, 1]}
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
