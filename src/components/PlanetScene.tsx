"use client";

import { ContactShadows, Stars } from "@react-three/drei";
import { PlanetSurface } from "./PlanetSurface";
import { DroppableObject } from "./DroppableObject";
import { PostProcessing } from "./PostProcessing";
import type { CelestialBody, DroppableObject as DroppableObjectType, DropPhase } from "@/types";

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

  return (
    <>
      {/* Ambient fill — slightly tinted */}
      <ambientLight intensity={0.3} color={lightColor} />

      {/* Main directional light with shadows */}
      <directionalLight
        position={[5, 12, 5]}
        intensity={1.2}
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

      {/* Rim light for visual pop */}
      <directionalLight
        position={[-3, 5, -5]}
        intensity={0.4}
        color="#8888ff"
      />

      {/* Starfield for airless bodies */}
      {isAirless && (
        <Stars radius={100} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />
      )}

      <PlanetSurface
        surfaceColor={planet.surfaceColor}
        skyColor={planet.skyColor}
        planetId={planet.id}
      />

      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={10}
      />

      <DroppableObject
        gravity={planet.gravity}
        phase={phase}
        objectId={object.id}
        fallbackColor={object.fallbackColor}
        scale={object.scale}
        squashFactor={object.squashFactor}
        side={side}
        onLand={onLand}
      />

      <PostProcessing planetId={planet.id} />

      <color attach="background" args={[planet.skyColor]} />
    </>
  );
}
