"use client";

import { useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { PlanetScene } from "./PlanetScene";
import { useDropContext } from "@/contexts/DropContext";
import { getPlanetById } from "@/lib/planets";
import { getObjectById } from "@/lib/objects";

export function ComparisonView() {
  const {
    leftPlanetId,
    rightPlanetId,
    objectId,
    phase,
    land,
  } = useDropContext();

  const leftRef = useRef<HTMLDivElement>(null!);
  const rightRef = useRef<HTMLDivElement>(null!);
  const canvasContainerRef = useRef<HTMLDivElement>(null!);

  const leftPlanet = getPlanetById(leftPlanetId)!;
  const rightPlanet = getPlanetById(rightPlanetId)!;
  const selectedObject = getObjectById(objectId)!;

  // Track landings — call land() when both sides have landed
  const landedCount = useRef(0);

  const handleLand = useCallback(() => {
    landedCount.current += 1;
    if (landedCount.current >= 2) {
      land();
      landedCount.current = 0;
    }
  }, [land]);

  // Reset landing counter when phase changes to idle
  if (phase === "idle") {
    landedCount.current = 0;
  }

  return (
    <div ref={canvasContainerRef} className="relative flex flex-1 flex-col md:flex-row">
      {/* Left panel tracking div */}
      <div ref={leftRef} className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-10">
          <span
            className="text-lg font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: leftPlanet.color + "30", color: leftPlanet.color }}
          >
            {leftPlanet.emoji} {leftPlanet.name} ({leftPlanet.relativeGravity}g)
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden md:block w-px bg-white/10" />
      <div className="block md:hidden h-px bg-white/10" />

      {/* Right panel tracking div */}
      <div ref={rightRef} className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-10">
          <span
            className="text-lg font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: rightPlanet.color + "30", color: rightPlanet.color }}
          >
            {rightPlanet.emoji} {rightPlanet.name} ({rightPlanet.relativeGravity}g)
          </span>
        </div>
      </div>

      {/* Single Canvas with two Views */}
      <Canvas
        className="!absolute inset-0 z-0"
        shadows
        camera={{ position: [0, 5, 12], fov: 50 }}
        eventSource={canvasContainerRef}
      >
        <View track={leftRef}>
          <PlanetScene
            planet={leftPlanet}
            object={selectedObject}
            phase={phase}
            onLand={handleLand}
          />
        </View>
        <View track={rightRef}>
          <PlanetScene
            planet={rightPlanet}
            object={selectedObject}
            phase={phase}
            onLand={handleLand}
          />
        </View>
      </Canvas>
    </div>
  );
}
