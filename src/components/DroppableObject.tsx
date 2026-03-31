"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useGravitySim } from "@/hooks/useGravitySim";
import { simStore } from "@/hooks/useSimStore";
import { springStep, wobble } from "@/lib/springPhysics";
import { calculateSquash, getMaxVelocity } from "@/lib/physics";
import { ImpactParticles } from "./ImpactParticles";
import { ShockwaveRing } from "./ShockwaveRing";
import { SplatDebris } from "./SplatDebris";
import type { DropPhase } from "@/types";

interface DroppableObjectProps {
  gravity: number;
  phase: DropPhase;
  objectId: string;
  fallbackColor: string;
  scale: number;
  squashFactor: number;
  restitution: number;
  mass: number;
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
        <group>
          {/* Main body — slightly oval */}
          <mesh castShadow scale={[1, 0.85, 1]}>
            <sphereGeometry args={[scale * 0.45, 32, 32]} />
            <meshStandardMaterial
              color="#1a7a1a"
              roughness={0.6}
              metalness={0.0}
            />
          </mesh>
          {/* Dark stripes — rings around the watermelon */}
          {[0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8].map((angle, i) => (
            <mesh key={i} castShadow rotation={[0, angle, 0]} scale={[1, 0.85, 1]}>
              <torusGeometry args={[scale * 0.45, scale * 0.018, 4, 32]} />
              <meshStandardMaterial
                color="#0d4d0d"
                roughness={0.7}
              />
            </mesh>
          ))}
          {/* Stem nub on top */}
          <mesh castShadow position={[0, scale * 0.37, 0]}>
            <cylinderGeometry args={[scale * 0.02, scale * 0.03, scale * 0.06, 6]} />
            <meshStandardMaterial color="#5a4a2a" roughness={0.9} />
          </mesh>
          {/* Light patch / field spot on bottom */}
          <mesh position={[0, -scale * 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[scale * 0.12, 12]} />
            <meshStandardMaterial color="#c8b848" roughness={0.8} />
          </mesh>
        </group>
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
    case "school-bus": {
      const s = scale;
      const yellow = "#e8a818";
      const darkYellow = "#c08a10";
      const black = "#1a1a1a";
      const gray = "#444444";
      const chrome = "#aaaaaa";
      const glass = "#88bbdd";
      const bodyMat = <meshStandardMaterial color={yellow} roughness={0.45} metalness={0.15} />;
      return (
        <group>
          {/* Main body */}
          <mesh castShadow>
            <boxGeometry args={[s * 1.4, s * 0.42, s * 0.48]} />
            {bodyMat}
          </mesh>

          {/* Roof */}
          <mesh castShadow position={[0, s * 0.24, 0]}>
            <boxGeometry args={[s * 1.36, s * 0.08, s * 0.46]} />
            <meshStandardMaterial color={darkYellow} roughness={0.5} metalness={0.1} />
          </mesh>
          <mesh position={[0, s * 0.285, 0]}>
            <boxGeometry args={[s * 1.3, s * 0.02, s * 0.42]} />
            <meshStandardMaterial color={darkYellow} roughness={0.5} metalness={0.1} />
          </mesh>

          {/* Hood — front section */}
          <mesh castShadow position={[s * 0.62, -0.06 * s, 0]}>
            <boxGeometry args={[s * 0.28, s * 0.3, s * 0.46]} />
            {bodyMat}
          </mesh>
          <mesh castShadow position={[s * 0.68, s * 0.08, 0]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[s * 0.2, s * 0.08, s * 0.44]} />
            {bodyMat}
          </mesh>

          {/* Black bumper strip */}
          <mesh position={[0, -s * 0.22, 0]}>
            <boxGeometry args={[s * 1.42, s * 0.06, s * 0.49]} />
            <meshStandardMaterial color={black} roughness={0.8} metalness={0.05} />
          </mesh>

          {/* Gray lower panel (both sides) */}
          {[1, -1].map((side) => (
            <mesh key={`lp${side}`} position={[-s * 0.08, -s * 0.1, side * s * 0.241]}>
              <boxGeometry args={[s * 1.1, s * 0.18, s * 0.01]} />
              <meshStandardMaterial color={gray} roughness={0.6} metalness={0.1} />
            </mesh>
          ))}

          {/* Chrome bumpers front + rear */}
          <mesh position={[s * 0.76, -s * 0.2, 0]}>
            <boxGeometry args={[s * 0.04, s * 0.06, s * 0.42]} />
            <meshStandardMaterial color={chrome} roughness={0.2} metalness={0.6} />
          </mesh>
          <mesh position={[-s * 0.72, -s * 0.2, 0]}>
            <boxGeometry args={[s * 0.04, s * 0.06, s * 0.42]} />
            <meshStandardMaterial color={chrome} roughness={0.2} metalness={0.6} />
          </mesh>

          {/* Grille */}
          <mesh position={[s * 0.76, -s * 0.04, 0]}>
            <boxGeometry args={[s * 0.02, s * 0.14, s * 0.34]} />
            <meshStandardMaterial color={chrome} roughness={0.3} metalness={0.5} />
          </mesh>

          {/* Headlights */}
          {[0.12, -0.12].map((z, i) => (
            <mesh key={`hl${i}`} position={[s * 0.77, 0, z * s]}>
              <boxGeometry args={[s * 0.02, s * 0.06, s * 0.08]} />
              <meshStandardMaterial color="#ffffcc" roughness={0.1} metalness={0.3} emissive="#ffffaa" emissiveIntensity={0.3} />
            </mesh>
          ))}

          {/* Tail lights */}
          {[0.18, -0.18].map((z, i) => (
            <mesh key={`tl${i}`} position={[-s * 0.71, 0, z * s]}>
              <boxGeometry args={[s * 0.02, s * 0.06, s * 0.06]} />
              <meshStandardMaterial color="#cc2200" roughness={0.3} metalness={0.1} emissive="#cc0000" emissiveIntensity={0.2} />
            </mesh>
          ))}

          {/* Top warning lights */}
          {[0.15, -0.15].map((z, i) => (
            <mesh key={`wl${i}`} position={[s * 0.55, s * 0.29, z * s]}>
              <boxGeometry args={[s * 0.04, s * 0.03, s * 0.04]} />
              <meshStandardMaterial color="#dd3300" roughness={0.3} metalness={0.1} emissive="#dd2200" emissiveIntensity={0.15} />
            </mesh>
          ))}

          {/* Windshield */}
          <mesh position={[s * 0.56, s * 0.1, 0]}>
            <boxGeometry args={[s * 0.01, s * 0.22, s * 0.4]} />
            <meshPhysicalMaterial color={glass} roughness={0.05} metalness={0.1} clearcoat={0.8} transparent opacity={0.5} />
          </mesh>

          {/* Side windows — both sides */}
          {[1, -1].map((side) =>
            [-0.3, -0.1, 0.1, 0.3].map((xOff, i) => (
              <mesh key={`w${side}${i}`} position={[(xOff - 0.08) * s, s * 0.1, side * s * 0.242]}>
                <boxGeometry args={[s * 0.14, s * 0.18, s * 0.01]} />
                <meshPhysicalMaterial color={glass} roughness={0.05} metalness={0.1} clearcoat={0.5} transparent opacity={0.5} />
              </mesh>
            ))
          )}

          {/* Window pillars — both sides */}
          {[1, -1].map((side) =>
            [-0.22, -0.02, 0.18].map((xOff, i) => (
              <mesh key={`p${side}${i}`} position={[(xOff - 0.08) * s, s * 0.1, side * s * 0.243]}>
                <boxGeometry args={[s * 0.02, s * 0.2, s * 0.01]} />
                {bodyMat}
              </mesh>
            ))
          )}

          {/* Rear window */}
          <mesh position={[-s * 0.701, s * 0.08, 0]}>
            <boxGeometry args={[s * 0.01, s * 0.16, s * 0.28]} />
            <meshPhysicalMaterial color={glass} roughness={0.05} metalness={0.1} clearcoat={0.5} transparent opacity={0.45} />
          </mesh>

          {/* Wheels with hubcaps */}
          {[
            [0.42, -0.28, 0.24], [0.42, -0.28, -0.24],
            [-0.42, -0.28, 0.24], [-0.42, -0.28, -0.24],
          ].map(([x, y, z], i) => (
            <group key={`wh${i}`} position={[x * s, y * s, z * s]}>
              <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[s * 0.1, s * 0.1, s * 0.07, 16]} />
                <meshStandardMaterial color={black} roughness={0.95} metalness={0.0} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, (z > 0 ? 1 : -1) * s * 0.036]}>
                <cylinderGeometry args={[s * 0.05, s * 0.05, s * 0.01, 12]} />
                <meshStandardMaterial color={chrome} roughness={0.2} metalness={0.6} />
              </mesh>
            </group>
          ))}

          {/* Side mirrors */}
          {[0.26, -0.26].map((z, i) => (
            <mesh key={`m${i}`} position={[s * 0.6, s * 0.14, z * s]}>
              <boxGeometry args={[s * 0.02, s * 0.04, s * 0.03]} />
              <meshStandardMaterial color={black} roughness={0.3} metalness={0.4} />
            </mesh>
          ))}

          {/* "SCHOOL BUS" sign area */}
          <mesh position={[s * 0.5, s * 0.27, 0]}>
            <boxGeometry args={[s * 0.18, s * 0.05, s * 0.22]} />
            <meshStandardMaterial color={black} roughness={0.7} metalness={0.05} />
          </mesh>

          {/* Door indent (right side near front) */}
          <mesh position={[s * 0.3, -s * 0.02, s * 0.243]}>
            <boxGeometry args={[s * 0.15, s * 0.36, s * 0.005]} />
            <meshStandardMaterial color={darkYellow} roughness={0.5} metalness={0.1} />
          </mesh>

          {/* Horizontal trim lines (both sides) */}
          {[1, -1].map((side) => (
            <mesh key={`trim${side}`} position={[-s * 0.08, 0, side * s * 0.244]}>
              <boxGeometry args={[s * 1.2, s * 0.015, s * 0.005]} />
              <meshStandardMaterial color={black} roughness={0.8} metalness={0.05} />
            </mesh>
          ))}
        </group>
      );
    }
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
  restitution,
  mass,
  side,
  planetId,
  onLand,
}: DroppableObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sim = useGravitySim(gravity, phase, restitution, onLand);

  const squashSpring = useRef({ scaleY: 1, velY: 0 });
  const wobbleTimer = useRef(0);
  const wasLanded = useRef(false);
  const anticipationProgress = useRef(0);
  const rotationY = useRef(0);
  const [splatted, setSplatted] = useState(false);

  const setter = side === "left" ? simStore.setLeft : simStore.setRight;
  setter(sim);

  useEffect(() => {
    if (phase === "idle") {
      wasLanded.current = false;
      anticipationProgress.current = 0;
      squashSpring.current = { scaleY: 1, velY: 0 };
      wobbleTimer.current = 0;
      rotationY.current = 0;
      setSplatted(false);
    }
  }, [phase]);

  // Hide mesh when watermelon (or other splattable) splatters
  useEffect(() => {
    if (sim.landed && sim.impactVelocity > 0) {
      // Splat threshold matches SplatDebris config
      const SPLAT_MIN_VEL: Record<string, number> = { watermelon: 8, "school-bus": 10 };
      const minVel = SPLAT_MIN_VEL[objectId];
      if (minVel && sim.impactVelocity >= minVel) {
        setSplatted(true);
      }
    }
  }, [sim.landed, sim.impactVelocity, objectId]);

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
      // Read frame-accurate position from live ref (not React state)
      const livePos = sim.live.position;
      const liveBouncing = sim.live.bouncing;
      const liveVel = sim.live.velocity;

      if (liveBouncing) {
        if (livePos > 0.01) {
          // In the air during a bounce — use live position, apply velocity-based stretch
          yPos = livePos * SCENE_SCALE + scale * 0.5;
          const squashResult = calculateSquash(liveVel, maxVel, squashFactor * 0.4, false);
          sy = squashResult.scaleY;
          sxz = squashResult.scaleX;
        } else {
          // Momentary ground contact during bounce — brief squash proportional to velocity
          const impactSquash = calculateSquash(liveVel, maxVel, squashFactor * 0.6, true);
          sy = impactSquash.scaleY;
          sxz = impactSquash.scaleX;
          yPos = scale * 0.5 * sy;
        }
        // Keep wasLanded false so final settle gets a fresh start
        wasLanded.current = false;
      } else {
        // Bouncing is done — final settle with spring + wobble
        if (!wasLanded.current) {
          const impactSquash = calculateSquash(sim.impactVelocity * Math.pow(restitution, 2), maxVel, squashFactor, true);
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
    }

    // Slow tumble rotation while falling or bouncing
    if (!sim.landed || (sim.live.bouncing && sim.live.position > 0.01)) {
      rotationY.current += delta * 1.5;
      group.rotation.y = rotationY.current;
    }

    group.position.y = yPos;
    group.scale.set(sxz, Math.max(sy, 0.1), sxz);
  });

  const objectMesh = splatted ? null : <ObjectGeometry objectId={objectId} color={fallbackColor} scale={scale} />;

  const impactEffects = (
    <>
      <ImpactParticles
        planetId={planetId}
        gravity={gravity}
        impactVelocity={sim.impactVelocity}
        phase={phase}
        landed={sim.landed}
      />
      <ShockwaveRing
        planetId={planetId}
        gravity={gravity}
        impactVelocity={sim.impactVelocity}
        objectMass={mass}
        phase={phase}
        landed={sim.landed}
      />
      <SplatDebris
        objectId={objectId}
        gravity={gravity}
        impactVelocity={sim.impactVelocity}
        objectScale={scale}
        phase={phase}
        landed={sim.landed}
      />
    </>
  );

  if (phase === "idle") {
    return (
      <>
        <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5} floatingRange={[-0.15, 0.15]}>
          <group position={[0, 20 * SCENE_SCALE + scale * 0.5, 0]}>
            {objectMesh}
          </group>
        </Float>
        {impactEffects}
      </>
    );
  }

  return (
    <>
      <group ref={groupRef}>{objectMesh}</group>
      {impactEffects}
    </>
  );
}
