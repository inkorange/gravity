"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { DropPhase } from "@/types";

interface SplatDebrisProps {
  objectId: string;
  gravity: number;
  impactVelocity: number;
  objectScale: number;
  phase: DropPhase;
  landed: boolean;
}

interface ChunkConfig {
  count: number;
  colors: string[];
  innerColor?: string;
  minSize: number;
  maxSize: number;
  minVel: number;
  maxVel: number;
  shape: "organic" | "boxy";
  // Spawn volume relative to objectScale — chunks start distributed across this box
  spawnExtent: [number, number, number]; // half-extents [x, y, z]
}

const SPLAT_CONFIGS: Record<string, ChunkConfig> = {
  watermelon: {
    count: 20,
    colors: ["#2d8a2d", "#1a6b1a", "#3a9e3a"],
    innerColor: "#ff3040",
    minSize: 0.08,
    maxSize: 0.25,
    minVel: 8,
    maxVel: 25,
    shape: "organic",
    spawnExtent: [0.2, 0.2, 0.2], // roughly spherical
  },
  "school-bus": {
    count: 80,
    colors: ["#e8a818", "#c08a10", "#ffcc00", "#1a1a1a", "#444444", "#88bbdd"],
    innerColor: "#888888",
    minSize: 0.04,
    maxSize: 0.14,
    minVel: 10,
    maxVel: 25,
    shape: "boxy",
    spawnExtent: [0.7, 0.25, 0.24], // matches bus body: 1.4 long, 0.5 tall, 0.48 wide
  },
};

const MAX_CHUNKS = 80;

export function SplatDebris({ objectId, gravity, impactVelocity, objectScale, phase, landed }: SplatDebrisProps) {
  const config = SPLAT_CONFIGS[objectId];
  if (!config) return null;

  return (
    <SplatDebrisInner
      config={config}
      gravity={gravity}
      impactVelocity={impactVelocity}
      objectScale={objectScale}
      phase={phase}
      landed={landed}
    />
  );
}

interface InnerProps {
  config: ChunkConfig;
  gravity: number;
  impactVelocity: number;
  objectScale: number;
  phase: DropPhase;
  landed: boolean;
}

function SplatDebrisInner({ config, gravity, impactVelocity, objectScale, phase, landed }: InnerProps) {
  const groupRef = useRef<THREE.Group>(null);

  const state = useRef({
    active: false,
    triggered: false,
    elapsed: 0,
  });

  const chunks = useMemo(() => {
    const arr: {
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      rotation: THREE.Euler;
      rotSpeed: THREE.Vector3;
      scaleVec: THREE.Vector3; // non-uniform for boxy pieces
      color: string;
      settled: boolean;
    }[] = [];

    for (let i = 0; i < MAX_CHUNKS; i++) {
      arr.push({
        position: new THREE.Vector3(0, -50, 0),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        rotSpeed: new THREE.Vector3(),
        scaleVec: new THREE.Vector3(0.1, 0.1, 0.1),
        color: config.colors[0],
        settled: false,
      });
    }
    return arr;
  }, [config.colors]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const s = state.current;

    // Trigger on landing
    if (landed && impactVelocity > 0 && !s.triggered) {
      // Only splat if impact is strong enough
      const intensity = Math.max(0, (impactVelocity - config.minVel) / (config.maxVel - config.minVel));
      if (intensity <= 0) {
        s.triggered = true;
        return;
      }

      s.triggered = true;
      s.active = true;
      s.elapsed = 0;

      const splatIntensity = Math.min(intensity, 1);
      const count = Math.floor(config.count * (0.3 + splatIntensity * 0.7));
      const allColors = [...config.colors];
      if (config.innerColor) allColors.push(config.innerColor, config.innerColor, config.innerColor);

      const [ex, ey, ez] = config.spawnExtent;

      for (let i = 0; i < MAX_CHUNKS; i++) {
        const chunk = chunks[i];
        if (i < count) {
          // Spawn distributed across the object's volume
          const spawnX = (Math.random() - 0.5) * 2 * ex * objectScale;
          const spawnY = Math.random() * ey * objectScale * 2 + 0.05;
          const spawnZ = (Math.random() - 0.5) * 2 * ez * objectScale;

          chunk.position.set(spawnX, spawnY, spawnZ);

          // Velocity: burst outward from spawn position + upward
          // Pieces fly away from center proportional to their distance from it
          const distFromCenter = Math.sqrt(spawnX * spawnX + spawnZ * spawnZ);
          const dirX = distFromCenter > 0.01 ? spawnX / distFromCenter : (Math.random() - 0.5);
          const dirZ = distFromCenter > 0.01 ? spawnZ / distFromCenter : (Math.random() - 0.5);

          const outSpeed = (1 + Math.random() * 3 + distFromCenter * 2) * splatIntensity;
          const upSpeed = (1.5 + Math.random() * 5) * splatIntensity;

          chunk.velocity.set(
            dirX * outSpeed + (Math.random() - 0.5) * splatIntensity,
            upSpeed,
            dirZ * outSpeed + (Math.random() - 0.5) * splatIntensity,
          );

          // Random tumble
          chunk.rotSpeed.set(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
          );
          chunk.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
          );

          // Color + size
          const colorIdx = Math.floor(Math.random() * allColors.length);
          chunk.color = allColors[colorIdx];
          const isInner = chunk.color === config.innerColor;
          const baseSize = (isInner ? config.maxSize * 0.7 : config.minSize + Math.random() * (config.maxSize - config.minSize)) * objectScale;

          if (config.shape === "boxy") {
            // Flat panels, long beams, small cubes — varied aspect ratios
            const typeRoll = Math.random();
            if (typeRoll < 0.4) {
              // Flat panel (like a body panel or window shard)
              const sx = baseSize * (1.0 + Math.random() * 2.0);
              const sy = baseSize * (0.15 + Math.random() * 0.3);
              const sz = baseSize * (0.8 + Math.random() * 1.5);
              chunk.scaleVec.set(sx, sy, sz);
            } else if (typeRoll < 0.7) {
              // Long beam (like a frame rail or trim piece)
              const sx = baseSize * (2.0 + Math.random() * 3.0);
              const sy = baseSize * (0.2 + Math.random() * 0.3);
              const sz = baseSize * (0.2 + Math.random() * 0.3);
              chunk.scaleVec.set(sx, sy, sz);
            } else {
              // Small boxy chunk
              const sx = baseSize * (0.5 + Math.random() * 1.0);
              const sy = baseSize * (0.5 + Math.random() * 1.0);
              const sz = baseSize * (0.5 + Math.random() * 1.0);
              chunk.scaleVec.set(sx, sy, sz);
            }
          } else {
            chunk.scaleVec.set(baseSize, baseSize, baseSize);
          }

          chunk.settled = false;
        } else {
          chunk.position.y = -50;
          chunk.settled = true;
        }
      }

      // Update mesh visibility
      group.children.forEach((child, i) => {
        if (i < count) {
          child.visible = true;
          child.position.copy(chunks[i].position);
          child.rotation.copy(chunks[i].rotation);
          child.scale.copy(chunks[i].scaleVec);
          ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(chunks[i].color);
        } else {
          child.visible = false;
        }
      });

      return;
    }

    // Reset
    if (phase === "idle" || phase === "anticipation") {
      s.active = false;
      s.triggered = false;
      group.children.forEach(child => { child.visible = false; });
      return;
    }

    if (!s.active) return;

    s.elapsed += delta;

    // Physics update — chunks stay on the ground permanently
    const grav = gravity * 0.5;

    for (let i = 0; i < MAX_CHUNKS; i++) {
      const chunk = chunks[i];
      if (chunk.settled || chunk.position.y < -5) continue;

      const mesh = group.children[i];
      if (!mesh || !mesh.visible) continue;

      // Gravity
      chunk.velocity.y -= grav * delta;

      // Position
      chunk.position.x += chunk.velocity.x * delta;
      chunk.position.y += chunk.velocity.y * delta;
      chunk.position.z += chunk.velocity.z * delta;

      // Rotation tumble (slows down over time)
      chunk.rotation.x += chunk.rotSpeed.x * delta;
      chunk.rotation.y += chunk.rotSpeed.y * delta;
      chunk.rotation.z += chunk.rotSpeed.z * delta;
      chunk.rotSpeed.multiplyScalar(1 - delta * 0.5);

      // Ground collision
      if (chunk.position.y < 0) {
        chunk.position.y = 0;
        chunk.velocity.y *= -0.2;
        chunk.velocity.x *= 0.5;
        chunk.velocity.z *= 0.5;
        chunk.rotSpeed.multiplyScalar(0.3);

        if (Math.abs(chunk.velocity.y) < 0.1) {
          chunk.velocity.set(0, 0, 0);
          chunk.rotSpeed.set(0, 0, 0);
          chunk.settled = true;
        }
      }

      // Drag
      chunk.velocity.x *= (1 - delta * 0.5);
      chunk.velocity.z *= (1 - delta * 0.5);

      mesh.position.copy(chunk.position);
      mesh.rotation.copy(chunk.rotation);
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: MAX_CHUNKS }, (_, i) => (
        <mesh key={i} visible={false} castShadow>
          {config.shape === "boxy" ? (
            <boxGeometry args={[1, 1, 1]} />
          ) : (
            <dodecahedronGeometry args={[1, 0]} />
          )}
          <meshStandardMaterial
            color={config.colors[0]}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}
