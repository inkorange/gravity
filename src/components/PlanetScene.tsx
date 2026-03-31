"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ContactShadows, Stars } from "@react-three/drei";
import { PlanetSurface } from "./PlanetSurface";
import { DroppableObject } from "./DroppableObject";
import { AmbientParticles } from "./AmbientParticles";
import { SkyDome } from "./SkyDome";
import type { CelestialBody, DroppableObject as DroppableObjectType, DropPhase } from "@/types";

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const cam = camera as THREE.PerspectiveCamera;
    // Wider FOV on narrow/portrait viewports so more scene is visible
    cam.fov = aspect < 1 ? 65 : 50;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

// Planets with no atmosphere get a starfield
const AIRLESS_BODIES = new Set(["moon", "europa", "pluto"]);

// Light color temperature per planet
const LIGHT_COLORS: Record<string, string> = {
  earth: "#fff5e6",
  moon: "#cce0ff",
  mars: "#ffe0c0",
  jupiter: "#ffe8c0",
  sun: "#ffdd88",
  pluto: "#c0d8ff",
  europa: "#c0d8ff",
  titan: "#ffd080",
};

// Fog configuration per planet for atmospheric depth
const FOG_CONFIG: Record<string, { color: string; near: number; far: number }> = {
  earth: { color: "#6aafe0", near: 15, far: 45 },
  moon: { color: "#111118", near: 25, far: 60 },
  mars: { color: "#c07040", near: 12, far: 40 },
  jupiter: { color: "#b08040", near: 15, far: 45 },
  sun: { color: "#cc3300", near: 10, far: 35 },
  pluto: { color: "#0d0d1a", near: 20, far: 55 },
  europa: { color: "#080818", near: 20, far: 55 },
  titan: { color: "#a07020", near: 10, far: 35 },
};

interface PlanetSceneProps {
  planet: CelestialBody;
  object: DroppableObjectType;
  phase: DropPhase;
  side: "left" | "right";
  onLand?: () => void;
}

export function PlanetScene({ planet, object, phase, side, onLand }: PlanetSceneProps) {
  const lightColor = LIGHT_COLORS[planet.id] ?? "#ffffff";
  const isAirless = AIRLESS_BODIES.has(planet.id);
  const fog = FOG_CONFIG[planet.id] ?? FOG_CONFIG.earth;

  return (
    <>
      {/* Per-planet fog for atmospheric depth */}
      <fog attach="fog" args={[fog.color, fog.near, fog.far]} />

      {/* Hemisphere light for richer ambient fill (sky + ground bounce) */}
      <hemisphereLight
        args={[lightColor, planet.surfaceColor, 0.4]}
      />

      {/* Ambient fill — slightly tinted */}
      <ambientLight intensity={0.2} color={lightColor} />

      {/* Main directional light with shadows */}
      <directionalLight
        position={[5, 12, 5]}
        intensity={1.4}
        color={lightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />

      {/* Rim light for visual pop — stronger for cinematic feel */}
      <directionalLight
        position={[-3, 5, -5]}
        intensity={0.6}
        color="#8888ff"
      />

      {/* Fill light from below for softer shadows */}
      <directionalLight
        position={[0, -2, 3]}
        intensity={0.15}
        color={lightColor}
      />

      {/* Starfield for airless bodies */}
      {isAirless && (
        <Stars radius={100} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />
      )}

      <SkyDome skyColor={planet.skyColor} planetId={planet.id} />

      <PlanetSurface
        surfaceColor={planet.surfaceColor}
        skyColor={planet.skyColor}
        planetId={planet.id}
      />

      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={20}
        blur={1.5}
        far={10}
      />

      <AmbientParticles planetId={planet.id} />

      <DroppableObject
        gravity={planet.gravity}
        phase={phase}
        objectId={object.id}
        fallbackColor={object.fallbackColor}
        scale={object.scale}
        squashFactor={object.squashFactor}
        restitution={object.restitution}
        mass={object.mass}
        side={side}
        planetId={planet.id}
        onLand={onLand}
      />

      <ResponsiveCamera />
      <color attach="background" args={[planet.skyColor]} />
    </>
  );
}
