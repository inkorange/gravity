"use client";

import { useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { PlanetScene } from "./PlanetScene";
import { PlanetSelector } from "./PlanetSelector";
import { HUD } from "./HUD";
import { FunFact } from "./FunFact";
import { useDropContext } from "@/contexts/DropContext";
import { useScreenShake } from "@/hooks/useScreenShake";
import { getPlanetById } from "@/lib/planets";
import { getObjectById } from "@/lib/objects";
import { getMaxVelocity } from "@/lib/physics";

export function ComparisonView() {
  const {
    leftPlanetId,
    rightPlanetId,
    objectId,
    phase,
    land,
    setLeftPlanet,
    setRightPlanet,
  } = useDropContext();

  const leftRef = useRef<HTMLDivElement>(null!);
  const rightRef = useRef<HTMLDivElement>(null!);
  const canvasContainerRef = useRef<HTMLDivElement>(null!);
  const { containerRef: shakeRef, trigger: triggerShake } = useScreenShake();

  const leftPlanet = getPlanetById(leftPlanetId)!;
  const rightPlanet = getPlanetById(rightPlanetId)!;
  const selectedObject = getObjectById(objectId)!;

  // Track landings — call land() when both sides have landed
  const landedCount = useRef(0);
  const hasShaken = useRef(false);

  // Trigger screen shake when landing
  useEffect(() => {
    if (phase === "landed" && !hasShaken.current) {
      const maxGravity = Math.max(leftPlanet.gravity, rightPlanet.gravity);
      const maxVel = getMaxVelocity(maxGravity);
      const intensity = Math.min(maxVel / getMaxVelocity(274), 1);
      triggerShake(intensity);
      hasShaken.current = true;
    }
    if (phase === "idle") {
      hasShaken.current = false;
    }
  }, [phase, leftPlanet.gravity, rightPlanet.gravity, triggerShake]);

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
    <div className="flex flex-col flex-1 min-h-0">
      {/* 3D Scenes — shake ref wraps the scene area including the Canvas */}
      <div ref={shakeRef} className="relative flex flex-1 flex-col md:flex-row min-h-0 overflow-hidden">
        <div ref={canvasContainerRef} className="absolute inset-0">
          {/* Left panel */}
          <div ref={leftRef} className="absolute top-0 left-0 bottom-0 w-1/2 max-md:w-full max-md:h-1/2 max-md:bottom-auto">
            <HUD side="left" planet={leftPlanet} />
            <FunFact planet={leftPlanet} phase={phase} />
            <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none z-10">
              <span
                className="text-base font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: leftPlanet.color + "30", color: leftPlanet.color }}
              >
                {leftPlanet.emoji} {leftPlanet.name} ({leftPlanet.relativeGravity}g)
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 max-md:hidden z-10" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 md:hidden z-10" />

          {/* Right panel */}
          <div ref={rightRef} className="absolute top-0 right-0 bottom-0 w-1/2 max-md:w-full max-md:h-1/2 max-md:top-1/2">
            <HUD side="right" planet={rightPlanet} />
            <FunFact planet={rightPlanet} phase={phase} />
            <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none z-10">
              <span
                className="text-base font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: rightPlanet.color + "30", color: rightPlanet.color }}
              >
                {rightPlanet.emoji} {rightPlanet.name} ({rightPlanet.relativeGravity}g)
              </span>
            </div>
          </div>

          {/* Single Canvas with two Views */}
          <Canvas
            className="!absolute inset-0"
            shadows
            camera={{ position: [0, 5, 12], fov: 50 }}
            eventSource={canvasContainerRef}
          >
            <View track={leftRef}>
              <PlanetScene
                planet={leftPlanet}
                object={selectedObject}
                phase={phase}
                side="left"
                onLand={handleLand}
              />
            </View>
            <View track={rightRef}>
              <PlanetScene
                planet={rightPlanet}
                object={selectedObject}
                phase={phase}
                side="right"
                onLand={handleLand}
              />
            </View>
          </Canvas>
        </div>
      </div>

      {/* Planet selectors below the scenes */}
      <div className="flex flex-col md:flex-row border-t border-white/10">
        <div className="flex-1 border-b md:border-b-0 md:border-r border-white/10">
          <PlanetSelector
            selectedId={leftPlanetId}
            onSelect={setLeftPlanet}
            side="left"
          />
        </div>
        <div className="flex-1">
          <PlanetSelector
            selectedId={rightPlanetId}
            onSelect={setRightPlanet}
            side="right"
          />
        </div>
      </div>
    </div>
  );
}
