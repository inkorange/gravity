"use client";

import { useRef, useEffect, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useGravitySim } from "@/hooks/useGravitySim";
import { simStore } from "@/hooks/useSimStore";
import { springStep, wobble } from "@/lib/springPhysics";
import { calculateSquash, getMaxVelocity } from "@/lib/physics";
import { ImpactParticles } from "./ImpactParticles";
import type { DropPhase } from "@/types";

interface DroppableObjectProps {
  gravity: number;
  phase: DropPhase;
  objectId: string;
  fallbackColor: string;
  scale: number;
  squashFactor: number;
  side: "left" | "right";
  planetId: string;
  onLand?: () => void;
}

const SCENE_SCALE = 0.5;
const SQUASH_STIFFNESS = 180;
const SQUASH_DAMPING = 8;

/**
 * Per-object procedural geometry with PBR materials.
 * These replace the placeholder boxes with recognizable shapes.
 */
function ObjectGeometry({ objectId, color, scale }: { objectId: string; color: string; scale: number }) {
  switch (objectId) {
    case "bowling-ball":
      return (
        <mesh castShadow>
          <sphereGeometry args={[scale * 0.5, 32, 32]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.1}
            metalness={0.0}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
          />
        </mesh>
      );
    case "feather":
      return (
        <mesh castShadow rotation={[0, 0, Math.PI * 0.1]}>
          <planeGeometry args={[scale * 0.3, scale * 1.2]} />
          <meshStandardMaterial
            color={color}
            roughness={0.9}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      );
    case "watermelon":
      return (
        <mesh castShadow>
          <sphereGeometry args={[scale * 0.45, 32, 32]} />
          <meshStandardMaterial
            color={color}
            roughness={0.6}
            metalness={0.0}
          />
        </mesh>
      );
    case "elephant":
      return (
        <group>
          {/* Body */}
          <mesh castShadow position={[0, 0, 0]}>
            <capsuleGeometry args={[scale * 0.35, scale * 0.4, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.85} metalness={0.0} />
          </mesh>
          {/* Head */}
          <mesh castShadow position={[scale * 0.35, scale * 0.15, 0]}>
            <sphereGeometry args={[scale * 0.22, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.85} metalness={0.0} />
          </mesh>
          {/* Legs */}
          {[[-0.2, -0.35, 0.15], [-0.2, -0.35, -0.15], [0.15, -0.35, 0.15], [0.15, -0.35, -0.15]].map(
            ([x, y, z], i) => (
              <mesh key={i} castShadow position={[x * scale, y * scale, z * scale]}>
                <cylinderGeometry args={[scale * 0.08, scale * 0.1, scale * 0.3, 8]} />
                <meshStandardMaterial color={color} roughness={0.85} />
              </mesh>
            )
          )}
        </group>
      );
    case "astronaut":
      return (
        <group>
          {/* Body */}
          <mesh castShadow>
            <capsuleGeometry args={[scale * 0.2, scale * 0.35, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
          </mesh>
          {/* Helmet */}
          <mesh castShadow position={[0, scale * 0.38, 0]}>
            <sphereGeometry args={[scale * 0.18, 16, 16]} />
            <meshPhysicalMaterial
              color="#ffffff"
              roughness={0.1}
              metalness={0.3}
              clearcoat={1}
              clearcoatRoughness={0.05}
            />
          </mesh>
          {/* Visor */}
          <mesh position={[0, scale * 0.38, scale * 0.12]}>
            <sphereGeometry args={[scale * 0.13, 16, 16, 0, Math.PI]} />
            <meshPhysicalMaterial
              color="#1a1a3a"
              roughness={0.05}
              metalness={0.8}
              clearcoat={1}
            />
          </mesh>
        </group>
      );
    case "school-bus":
      return (
        <group>
          {/* Body */}
          <mesh castShadow>
            <boxGeometry args={[scale * 1.2, scale * 0.5, scale * 0.45]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
          </mesh>
          {/* Roof */}
          <mesh castShadow position={[0, scale * 0.3, 0]}>
            <boxGeometry args={[scale * 1.1, scale * 0.1, scale * 0.43]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
          </mesh>
          {/* Wheels */}
          {[[-0.4, -0.3, 0.25], [-0.4, -0.3, -0.25], [0.4, -0.3, 0.25], [0.4, -0.3, -0.25]].map(
            ([x, y, z], i) => (
              <mesh key={i} castShadow position={[x * scale, y * scale, z * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[scale * 0.1, scale * 0.1, scale * 0.06, 12]} />
                <meshStandardMaterial color="#222222" roughness={0.9} metalness={0.0} />
              </mesh>
            )
          )}
          {/* Windows */}
          <mesh position={[0, scale * 0.1, scale * 0.231]}>
            <boxGeometry args={[scale * 0.9, scale * 0.2, scale * 0.01]} />
            <meshPhysicalMaterial
              color="#88ccff"
              roughness={0.05}
              metalness={0.1}
              clearcoat={0.5}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh castShadow>
          <boxGeometry args={[scale, scale, scale]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      );
  }
}

export function DroppableObject({
  gravity,
  phase,
  objectId,
  fallbackColor,
  scale,
  squashFactor,
  side,
  planetId,
  onLand,
}: DroppableObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sim = useGravitySim(gravity, phase, onLand);

  const squashSpring = useRef({ scaleY: 1, velY: 0 });
  const wobbleTimer = useRef(0);
  const wasLanded = useRef(false);
  const anticipationProgress = useRef(0);

  const setter = side === "left" ? simStore.setLeft : simStore.setRight;
  setter(sim);

  useEffect(() => {
    if (phase === "idle") {
      wasLanded.current = false;
      anticipationProgress.current = 0;
      squashSpring.current = { scaleY: 1, velY: 0 };
      wobbleTimer.current = 0;
    }
  }, [phase]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const maxVel = getMaxVelocity(gravity);
    let sy = 1;
    let sxz = 1;
    let yPos = sim.position * SCENE_SCALE + scale * 0.5;

    if (phase === "anticipation") {
      anticipationProgress.current = Math.min(anticipationProgress.current + delta * 8, 1);
      const t = anticipationProgress.current;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      sy = 1 - ease * 0.2 * squashFactor;
      sxz = 1 / Math.sqrt(sy);
      yPos = 20 * SCENE_SCALE + scale * 0.5;
    } else if (phase === "dropping" && !sim.landed) {
      anticipationProgress.current = 0;
      const squashResult = calculateSquash(sim.velocity, maxVel, squashFactor, false);
      sy = squashResult.scaleY;
      sxz = squashResult.scaleX;
    } else if (sim.landed) {
      if (!wasLanded.current) {
        const impactSquash = calculateSquash(sim.impactVelocity, maxVel, squashFactor, true);
        squashSpring.current = { scaleY: impactSquash.scaleY, velY: 0 };
        wobbleTimer.current = 0;
        wasLanded.current = true;
      }

      const spring = springStep(
        squashSpring.current.scaleY,
        1,
        squashSpring.current.velY,
        SQUASH_STIFFNESS,
        SQUASH_DAMPING,
        delta
      );
      squashSpring.current.scaleY = spring.value;
      squashSpring.current.velY = spring.velocity;

      wobbleTimer.current += delta;
      const wobbleAmount = wobble(wobbleTimer.current, 6, 4, 0.08 * squashFactor);

      sy = spring.value + wobbleAmount;
      sxz = 1 / Math.sqrt(Math.max(sy, 0.1));

      yPos = scale * 0.5 * sy;
    }

    group.position.y = yPos;
    group.scale.set(sxz, Math.max(sy, 0.1), sxz);
  });

  const objectMesh = <ObjectGeometry objectId={objectId} color={fallbackColor} scale={scale} />;

  if (phase === "idle") {
    return (
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5} floatingRange={[-0.15, 0.15]}>
        <group position={[0, 20 * SCENE_SCALE + scale * 0.5, 0]}>
          {objectMesh}
        </group>
      </Float>
    );
  }

  return (
    <>
      <group ref={groupRef}>{objectMesh}</group>
      <ImpactParticles
        planetId={planetId}
        gravity={gravity}
        impactVelocity={sim.impactVelocity}
        phase={phase}
        landed={sim.landed}
      />
    </>
  );
}
