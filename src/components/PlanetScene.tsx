"use client";

import { PlanetSurface } from "./PlanetSurface";
import { DroppableObject } from "./DroppableObject";
import type { CelestialBody, DroppableObject as DroppableObjectType, DropPhase } from "@/types";

interface PlanetSceneProps {
  planet: CelestialBody;
  object: DroppableObjectType;
  phase: DropPhase;
  onLand?: () => void;
}

export function PlanetScene({ planet, object, phase, onLand }: PlanetSceneProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <PlanetSurface
        surfaceColor={planet.surfaceColor}
        skyColor={planet.skyColor}
      />
      <DroppableObject
        gravity={planet.gravity}
        phase={phase}
        fallbackColor={object.fallbackColor}
        scale={object.scale}
        onLand={onLand}
      />
      <color attach="background" args={[planet.skyColor]} />
    </>
  );
}
